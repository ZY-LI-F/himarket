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

package com.alibaba.himarket.api.v1.pubmed;

import com.alibaba.himarket.core.annotation.AdminOrDeveloperAuth;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.entity.PubmedRecord;
import com.alibaba.himarket.service.PubmedService;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "PubMed V1", description = "提供 PubMed 检索、详情缓存和项目附件引用")
@RestController
@RequestMapping("/api/v1/pubmed")
@RequiredArgsConstructor
@AdminOrDeveloperAuth
public class PubmedController {

    private static final String PUBMED_SOURCE_TYPE = "pubmed";
    private static final String PUBMED_TEXT_CONTENT_TYPE = "text/markdown";

    private final PubmedService pubmedService;

    @Operation(summary = "检索 PubMed")
    @PostMapping("/search")
    public PubmedSearchResponse search(
            @RequestBody(required = false) PubmedSearchRequest request,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer retmax,
            @RequestParam(required = false) Integer retMax,
            @RequestParam(required = false) String userId,
            Principal principal) {
        PubmedSearchRequest safeRequest = request == null ? PubmedSearchRequest.empty() : request;
        String resolvedUserId = resolveUserId(principal, firstText(safeRequest.userId(), userId));
        String resolvedQuery = requireText(firstText(safeRequest.query(), query), "query");
        Integer resolvedRetmax =
                firstInteger(safeRequest.retmax(), safeRequest.retMax(), retmax, retMax);

        PubmedService.SearchResult result =
                resolvedRetmax == null
                        ? pubmedService.search(resolvedUserId, resolvedQuery)
                        : pubmedService.search(resolvedUserId, resolvedQuery, resolvedRetmax);
        return PubmedSearchResponse.from(result);
    }

    @Operation(summary = "获取 PubMed 记录详情")
    @GetMapping("/records/{pmid}")
    public PubmedRecordResponse getRecord(
            @PathVariable String pmid,
            @RequestParam(required = false) String userId,
            Principal principal) {
        String resolvedUserId = resolveUserId(principal, userId);
        return PubmedRecordResponse.from(pubmedService.fetchByPmid(resolvedUserId, pmid));
    }

    @Operation(summary = "把 PubMed 记录作为项目附件引用")
    @PostMapping("/records/{pmid}/_attach")
    public PubmedAttachmentResponse attachAsAttachment(
            @PathVariable String pmid,
            @RequestBody(required = false) PubmedAttachRequest request,
            @RequestParam(required = false) String projectId,
            @RequestParam(name = "project_id", required = false) String projectIdSnake,
            @RequestParam(required = false) String userId,
            Principal principal) {
        PubmedAttachRequest safeRequest = request == null ? PubmedAttachRequest.empty() : request;
        if (Boolean.TRUE.equals(safeRequest.fetchPdf())) {
            throw new BusinessException(
                    ErrorCode.INVALID_PARAMETER, "fetchPdf is not supported by this endpoint");
        }
        String resolvedUserId = resolveUserId(principal, firstText(safeRequest.userId(), userId));
        String resolvedProjectId =
                requireText(
                        firstText(
                                safeRequest.projectId(),
                                safeRequest.projectIdSnake(),
                                projectId,
                                projectIdSnake),
                        "projectId");

        PubmedRecord record = pubmedService.fetchByPmid(resolvedUserId, pmid);
        return PubmedAttachmentResponse.from(resolvedProjectId, record);
    }

    private static String resolveUserId(Principal principal, String requestedUserId) {
        if (principal != null && hasText(principal.getName())) {
            return principal.getName().trim();
        }
        return requireText(requestedUserId, "userId");
    }

    private static String requireText(String value, String field) {
        if (!hasText(value)) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, field + " must not be blank");
        }
        return value.trim();
    }

    private static String firstText(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private static Integer firstInteger(Integer... values) {
        if (values == null) {
            return null;
        }
        for (Integer value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record PubmedSearchRequest(String userId, String query, Integer retmax, Integer retMax) {

        static PubmedSearchRequest empty() {
            return new PubmedSearchRequest(null, null, null, null);
        }
    }

    public record PubmedAttachRequest(
            String userId,
            String projectId,
            @JsonProperty("project_id") String projectIdSnake,
            @JsonProperty("fetch_pdf") Boolean fetchPdf) {

        static PubmedAttachRequest empty() {
            return new PubmedAttachRequest(null, null, null, null);
        }
    }

    public record PubmedSearchResponse(
            String userId,
            String query,
            int retmax,
            long total,
            long totalCount,
            int returned,
            boolean cacheHit,
            long hitCount,
            List<String> pmids,
            List<PubmedRecordResponse> records) {

        static PubmedSearchResponse from(PubmedService.SearchResult result) {
            List<PubmedRecordResponse> records =
                    result.records().stream().map(PubmedRecordResponse::from).toList();
            return new PubmedSearchResponse(
                    result.userId(),
                    result.query(),
                    result.retmax(),
                    result.totalCount(),
                    result.totalCount(),
                    records.size(),
                    result.cacheHit(),
                    result.hitCount(),
                    List.copyOf(result.pmids()),
                    records);
        }
    }

    public record PubmedRecordResponse(
            String pmid,
            String title,
            List<String> authors,
            String journal,
            String pubDate,
            @JsonProperty("pub_date") String pubDateSnake,
            String abstractText,
            @JsonProperty("abstract") String abstractValue,
            String doi,
            @JsonProperty("mesh_terms") List<String> meshTerms) {

        static PubmedRecordResponse from(PubmedRecord record) {
            List<String> authors =
                    record.getAuthors() == null ? List.of() : List.copyOf(record.getAuthors());
            return new PubmedRecordResponse(
                    record.getPmid(),
                    record.getTitle(),
                    authors,
                    record.getJournal(),
                    record.getPubDate(),
                    record.getPubDate(),
                    record.getAbstractText(),
                    record.getAbstractText(),
                    record.getDoi(),
                    List.of());
        }
    }

    public record PubmedAttachmentResponse(
            String projectId,
            @JsonProperty("project_id") String projectIdSnake,
            String sourceType,
            String pmid,
            String attachmentId,
            String name,
            String contentType,
            PubmedRecordResponse record) {

        static PubmedAttachmentResponse from(String projectId, PubmedRecord record) {
            return new PubmedAttachmentResponse(
                    projectId,
                    projectId,
                    PUBMED_SOURCE_TYPE,
                    record.getPmid(),
                    PUBMED_SOURCE_TYPE + "-" + record.getPmid(),
                    PUBMED_SOURCE_TYPE + "-" + record.getPmid() + ".md",
                    PUBMED_TEXT_CONTENT_TYPE,
                    PubmedRecordResponse.from(record));
        }
    }
}
