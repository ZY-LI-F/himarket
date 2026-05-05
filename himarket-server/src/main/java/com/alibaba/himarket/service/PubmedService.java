/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package com.alibaba.himarket.service;

import cn.hutool.crypto.digest.DigestUtil;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.entity.PubmedRecord;
import com.alibaba.himarket.entity.PubmedSearch;
import com.alibaba.himarket.ratelimit.UserRateLimiter;
import com.alibaba.himarket.repository.PubmedRecordRepository;
import com.alibaba.himarket.repository.PubmedSearchRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestOperations;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

@Service
@Transactional
public class PubmedService {

    private static final String DEFAULT_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
    private static final int DEFAULT_RET_MAX = 20;
    private static final Pattern PMID_PATTERN = Pattern.compile("\\d+");

    private final PubmedRecordRepository recordRepository;
    private final PubmedSearchRepository searchRepository;
    private final UserRateLimiter rateLimiter;
    private final RestOperations restOperations;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final String baseUrl;

    public PubmedService(
            PubmedRecordRepository recordRepository,
            PubmedSearchRepository searchRepository,
            UserRateLimiter rateLimiter,
            RestTemplateBuilder restTemplateBuilder,
            ObjectMapper objectMapper,
            @Value("${pubmed.eutils.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl) {
        this(
                recordRepository,
                searchRepository,
                rateLimiter,
                restTemplateBuilder
                        .setConnectTimeout(Duration.ofSeconds(5))
                        .setReadTimeout(Duration.ofSeconds(20))
                        .build(),
                objectMapper,
                Clock.systemUTC(),
                baseUrl);
    }

    PubmedService(
            PubmedRecordRepository recordRepository,
            PubmedSearchRepository searchRepository,
            UserRateLimiter rateLimiter,
            RestOperations restOperations,
            ObjectMapper objectMapper,
            Clock clock,
            String baseUrl) {
        this.recordRepository = Objects.requireNonNull(recordRepository, "recordRepository");
        this.searchRepository = Objects.requireNonNull(searchRepository, "searchRepository");
        this.rateLimiter = Objects.requireNonNull(rateLimiter, "rateLimiter");
        this.restOperations = Objects.requireNonNull(restOperations, "restOperations");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.baseUrl = requireText(baseUrl, "baseUrl");
    }

    public SearchResult search(String userId, String query) {
        return search(userId, query, DEFAULT_RET_MAX);
    }

    public SearchResult search(String userId, String query, int retMax) {
        String normalizedUserId = requireText(userId, "userId");
        String normalizedQuery = requireText(query, "query");
        if (retMax <= 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "retMax must be positive");
        }

        rateLimiter.check(normalizedUserId);

        String queryHash = queryHash(normalizedQuery, retMax);
        PubmedSearch cachedSearch = searchRepository.findByQueryHash(queryHash).orElse(null);
        if (cachedSearch != null) {
            cachedSearch.setUserId(normalizedUserId);
            cachedSearch.setHitCount(safeHitCount(cachedSearch.getHitCount()) + 1L);
            searchRepository.save(cachedSearch);
            List<PubmedRecord> cachedRecords = recordsInOrder(cachedSearch.getPmids());
            return new SearchResult(
                    normalizedUserId,
                    cachedSearch.getQueryText(),
                    cachedSearch.getRetmax(),
                    cachedSearch.getTotalCount(),
                    true,
                    cachedSearch.getHitCount(),
                    List.copyOf(cachedSearch.getPmids()),
                    List.copyOf(cachedRecords));
        }

        SearchIds searchIds = searchPmids(normalizedQuery, retMax);
        List<String> pmids = searchIds.pmids();
        Map<String, PubmedRecord> cachedRecords = loadCached(pmids);
        List<String> missingPmids =
                pmids.stream().filter(pmid -> !cachedRecords.containsKey(pmid)).toList();
        Map<String, PubmedRecord> fetchedRecords = fetchAndCacheMissing(missingPmids);

        List<PubmedRecord> orderedRecords = new ArrayList<>(pmids.size());
        for (String pmid : pmids) {
            PubmedRecord record = cachedRecords.get(pmid);
            if (record == null) {
                record = fetchedRecords.get(pmid);
            }
            if (record == null) {
                throw new BusinessException(
                        ErrorCode.GATEWAY_ERROR, "NCBI response missing PubMed record " + pmid);
            }
            orderedRecords.add(record);
        }

        PubmedSearch search =
                PubmedSearch.builder()
                        .userId(normalizedUserId)
                        .queryHash(queryHash)
                        .queryText(normalizedQuery)
                        .retmax(retMax)
                        .totalCount(searchIds.totalCount())
                        .hitCount(1L)
                        .pmids(List.copyOf(pmids))
                        .build();
        searchRepository.save(search);
        return new SearchResult(
                normalizedUserId,
                normalizedQuery,
                retMax,
                searchIds.totalCount(),
                false,
                1L,
                List.copyOf(pmids),
                List.copyOf(orderedRecords));
    }

    public PubmedRecord fetchByPmid(String userId, String pmid) {
        String normalizedUserId = requireText(userId, "userId");
        String normalizedPmid = normalizePmid(pmid);
        return recordRepository
                .findById(normalizedPmid)
                .orElseGet(
                        () -> {
                            rateLimiter.check(normalizedUserId);
                            PubmedRecord fetched =
                                    fetchAndCacheMissing(List.of(normalizedPmid))
                                            .get(normalizedPmid);
                            if (fetched == null) {
                                throw new BusinessException(
                                        ErrorCode.GATEWAY_ERROR,
                                        "NCBI response missing PubMed record " + normalizedPmid);
                            }
                            return fetched;
                        });
    }

    private Map<String, PubmedRecord> loadCached(List<String> pmids) {
        if (pmids.isEmpty()) {
            return Map.of();
        }
        Map<String, PubmedRecord> records = new LinkedHashMap<>();
        for (PubmedRecord record : recordRepository.findByPmidIn(pmids)) {
            records.put(record.getPmid(), record);
        }
        return records;
    }

    private List<PubmedRecord> recordsInOrder(List<String> pmids) {
        Map<String, PubmedRecord> records = loadCached(pmids);
        List<PubmedRecord> orderedRecords = new ArrayList<>(pmids.size());
        for (String pmid : pmids) {
            PubmedRecord record = records.get(pmid);
            if (record == null) {
                throw new BusinessException(
                        ErrorCode.INTERNAL_ERROR, "PubMed cache is missing record " + pmid);
            }
            orderedRecords.add(record);
        }
        return orderedRecords;
    }

    private SearchIds searchPmids(String query, int retMax) {
        URI uri =
                uri(
                        "esearch.fcgi",
                        Map.of(
                                "db",
                                "pubmed",
                                "retmode",
                                "json",
                                "term",
                                query,
                                "retmax",
                                String.valueOf(retMax)));
        JsonNode result = readJson(uri, "esearch").path("esearchresult");
        JsonNode idList = result.path("idlist");
        if (!idList.isArray()) {
            throw new BusinessException(ErrorCode.GATEWAY_ERROR, "NCBI esearch missing idlist");
        }
        long totalCount = count(result.path("count"));
        List<String> pmids = new ArrayList<>();
        for (JsonNode id : idList) {
            pmids.add(normalizePmid(id.asText()));
        }
        return new SearchIds(totalCount, List.copyOf(pmids));
    }

    private Map<String, PubmedRecord> fetchAndCacheMissing(List<String> pmids) {
        if (pmids.isEmpty()) {
            return Map.of();
        }
        List<String> normalizedPmids = pmids.stream().map(this::normalizePmid).toList();
        Map<String, PubmedSummary> summaries = fetchSummaries(normalizedPmids);
        Map<String, String> abstracts = fetchAbstracts(normalizedPmids);

        Map<String, PubmedRecord> records = new LinkedHashMap<>();
        for (String pmid : normalizedPmids) {
            PubmedSummary summary = summaries.get(pmid);
            if (summary == null) {
                throw new BusinessException(
                        ErrorCode.GATEWAY_ERROR, "NCBI esummary missing PubMed record " + pmid);
            }
            PubmedRecord saved =
                    recordRepository.save(
                            PubmedRecord.builder()
                                    .pmid(pmid)
                                    .title(summary.title())
                                    .journal(summary.journal())
                                    .pubDate(summary.pubDate())
                                    .authors(summary.authors())
                                    .doi(summary.doi())
                                    .abstractText(abstracts.get(pmid))
                                    .build());
            records.put(saved.getPmid(), saved);
        }
        return records;
    }

    private Map<String, PubmedSummary> fetchSummaries(List<String> pmids) {
        URI uri =
                uri(
                        "esummary.fcgi",
                        Map.of(
                                "db", "pubmed",
                                "retmode", "json",
                                "id", String.join(",", pmids)));
        JsonNode result = readJson(uri, "esummary").path("result");
        Map<String, PubmedSummary> summaries = new LinkedHashMap<>();
        for (String pmid : pmids) {
            JsonNode node = result.path(pmid);
            if (node.isMissingNode() || node.isNull()) {
                continue;
            }
            summaries.put(pmid, parseSummary(node));
        }
        return summaries;
    }

    private Map<String, String> fetchAbstracts(List<String> pmids) {
        URI uri =
                uri(
                        "efetch.fcgi",
                        Map.of(
                                "db", "pubmed",
                                "retmode", "xml",
                                "id", String.join(",", pmids)));
        return parseAbstracts(get(uri, "efetch"));
    }

    private PubmedSummary parseSummary(JsonNode node) {
        List<String> authors = new ArrayList<>();
        JsonNode authorNodes = node.path("authors");
        if (authorNodes.isArray()) {
            for (JsonNode authorNode : authorNodes) {
                String name = textOrNull(authorNode.path("name"));
                if (name != null) {
                    authors.add(name);
                }
            }
        }
        return new PubmedSummary(
                textOrNull(node.path("title")),
                firstText(node, "fulljournalname", "source"),
                textOrNull(node.path("pubdate")),
                List.copyOf(authors),
                doi(node));
    }

    private Map<String, String> parseAbstracts(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setExpandEntityReferences(false);

            Element root =
                    factory.newDocumentBuilder()
                            .parse(new InputSource(new StringReader(xml)))
                            .getDocumentElement();
            NodeList articles = root.getElementsByTagName("PubmedArticle");
            Map<String, String> abstracts = new LinkedHashMap<>();
            for (int i = 0; i < articles.getLength(); i++) {
                Element article = (Element) articles.item(i);
                String pmid = firstElementText(article, "PMID");
                if (pmid == null) {
                    continue;
                }
                String abstractText = joinElementText(article, "AbstractText");
                if (abstractText != null) {
                    abstracts.put(normalizePmid(pmid), abstractText);
                }
            }
            return abstracts;
        } catch (ParserConfigurationException | SAXException | IOException e) {
            throw new BusinessException(
                    ErrorCode.GATEWAY_ERROR, e, "NCBI efetch XML parse failed: " + e.getMessage());
        }
    }

    private JsonNode readJson(URI uri, String operation) {
        try {
            return objectMapper.readTree(get(uri, operation));
        } catch (JsonProcessingException e) {
            throw new BusinessException(
                    ErrorCode.GATEWAY_ERROR,
                    e,
                    "NCBI " + operation + " JSON parse failed: " + e.getMessage());
        }
    }

    private String get(URI uri, String operation) {
        try {
            String body = restOperations.getForObject(uri, String.class);
            if (body == null || body.isBlank()) {
                throw new BusinessException(
                        ErrorCode.GATEWAY_ERROR, "NCBI " + operation + " returned empty body");
            }
            return body;
        } catch (RestClientException e) {
            throw new BusinessException(
                    ErrorCode.GATEWAY_ERROR,
                    e,
                    "NCBI " + operation + " request failed: " + e.getMessage());
        }
    }

    private URI uri(String path, Map<String, String> params) {
        UriComponentsBuilder builder =
                UriComponentsBuilder.fromUriString(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/")
                        .path(path);
        params.forEach(builder::queryParam);
        return builder.build().encode().toUri();
    }

    private String normalizePmid(String pmid) {
        String normalized = requireText(pmid, "pmid");
        if (!PMID_PATTERN.matcher(normalized).matches()) {
            throw new BusinessException(
                    ErrorCode.INVALID_PARAMETER, "pmid must contain digits only");
        }
        return normalized;
    }

    private static String doi(JsonNode node) {
        JsonNode articleIds = node.path("articleids");
        if (!articleIds.isArray()) {
            return null;
        }
        for (JsonNode articleId : articleIds) {
            if ("doi".equalsIgnoreCase(textOrNull(articleId.path("idtype")))) {
                return textOrNull(articleId.path("value"));
            }
        }
        return null;
    }

    private static String firstText(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            String value = textOrNull(node.path(fieldName));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String value = node.asText();
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String firstElementText(Element root, String tagName) {
        NodeList nodes = root.getElementsByTagName(tagName);
        if (nodes.getLength() == 0) {
            return null;
        }
        String value = nodes.item(0).getTextContent();
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String joinElementText(Element root, String tagName) {
        NodeList nodes = root.getElementsByTagName(tagName);
        if (nodes.getLength() == 0) {
            return null;
        }
        List<String> values = new ArrayList<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            Element element = (Element) nodes.item(i);
            String value = element.getTextContent();
            if (value != null && !value.isBlank()) {
                String label = element.getAttribute("Label");
                values.add(
                        label == null || label.isBlank()
                                ? value.trim()
                                : label + ": " + value.trim());
            }
        }
        return values.isEmpty() ? null : String.join("\n", values);
    }

    private static long count(JsonNode countNode) {
        String count = textOrNull(countNode);
        if (count == null) {
            throw new BusinessException(ErrorCode.GATEWAY_ERROR, "NCBI esearch missing count");
        }
        try {
            return Long.parseLong(count);
        } catch (NumberFormatException e) {
            throw new BusinessException(
                    ErrorCode.GATEWAY_ERROR, e, "NCBI esearch count is invalid: " + count);
        }
    }

    private static long safeHitCount(Long hitCount) {
        return hitCount == null ? 0L : hitCount;
    }

    private static String queryHash(String query, int retMax) {
        return DigestUtil.sha256Hex(query + "\u0000" + retMax);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, field + " must not be blank");
        }
        return value.trim();
    }

    public record SearchResult(
            String userId,
            String query,
            int retmax,
            long totalCount,
            boolean cacheHit,
            long hitCount,
            List<String> pmids,
            List<PubmedRecord> records) {}

    private record SearchIds(long totalCount, List<String> pmids) {}

    private record PubmedSummary(
            String title, String journal, String pubDate, List<String> authors, String doi) {}
}
