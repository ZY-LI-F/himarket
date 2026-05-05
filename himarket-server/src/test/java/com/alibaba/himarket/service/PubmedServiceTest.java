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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.entity.PubmedRecord;
import com.alibaba.himarket.entity.PubmedSearch;
import com.alibaba.himarket.ratelimit.UserRateLimiter;
import com.alibaba.himarket.repository.PubmedRecordRepository;
import com.alibaba.himarket.repository.PubmedSearchRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestOperations;

class PubmedServiceTest {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-05-05T10:15:30Z"), ZoneOffset.UTC);

    private PubmedRecordRepository recordRepository;
    private PubmedSearchRepository searchRepository;
    private UserRateLimiter rateLimiter;
    private RestOperations restOperations;
    private PubmedService service;

    @BeforeEach
    void setUp() {
        recordRepository = mock(PubmedRecordRepository.class);
        searchRepository = mock(PubmedSearchRepository.class);
        rateLimiter = mock(UserRateLimiter.class);
        restOperations = mock(RestOperations.class);
        service =
                new PubmedService(
                        recordRepository,
                        searchRepository,
                        rateLimiter,
                        restOperations,
                        new ObjectMapper(),
                        FIXED_CLOCK,
                        "https://ncbi.example.test/entrez/eutils");

        when(recordRepository.save(any(PubmedRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(searchRepository.save(any(PubmedSearch.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void cachedSearchIncrementsHitCountAndDoesNotCallNcbi() {
        PubmedSearch cached =
                PubmedSearch.builder()
                        .queryHash("query-hash")
                        .queryText("lung cancer")
                        .userId("user-a")
                        .retmax(50)
                        .totalCount(2L)
                        .pmids(List.of("100", "200"))
                        .hitCount(1L)
                        .build();

        when(searchRepository.findByQueryHash(anyString())).thenReturn(Optional.of(cached));
        when(recordRepository.findByPmidIn(any()))
                .thenReturn(List.of(record("100", "First title"), record("200", "Second title")));

        PubmedService.SearchResult result = service.search("user-b", "lung cancer", 50);

        assertTrue(result.cacheHit());
        assertEquals(2L, result.hitCount());
        assertEquals(
                List.of("100", "200"),
                result.records().stream().map(PubmedRecord::getPmid).toList());
        assertEquals("user-b", cached.getUserId());
        verifyNoInteractions(restOperations);
        verify(searchRepository).save(cached);
    }

    @Test
    void cacheMissCallsNcbiAndPersistsSearchHistory() {
        when(searchRepository.findByQueryHash(anyString())).thenReturn(Optional.empty());
        when(recordRepository.findByPmidIn(any())).thenReturn(List.of());

        List<URI> calledUris = new ArrayList<>();
        when(restOperations.getForObject(any(URI.class), eq(String.class)))
                .thenAnswer(
                        invocation -> {
                            URI uri = invocation.getArgument(0);
                            calledUris.add(uri);
                            if (uri.getPath().endsWith("/esearch.fcgi")) {
                                return """
                                {
                                  "esearchresult": {
                                    "count": "2",
                                    "idlist": ["100", "200"]
                                  }
                                }
                                """;
                            }
                            if (uri.getPath().endsWith("/esummary.fcgi")) {
                                return """
                                {
                                  "result": {
                                    "uids": ["100", "200"],
                                    "100": {
                                      "title": "First title",
                                      "fulljournalname": "Journal A",
                                      "pubdate": "2024 Jan",
                                      "authors": [{"name": "Alice"}],
                                      "articleids": [
                                        {"idtype": "pubmed", "value": "100"},
                                        {"idtype": "doi", "value": "10.100/example"}
                                      ]
                                    },
                                    "200": {
                                      "title": "Second title",
                                      "source": "Journal B",
                                      "pubdate": "2023",
                                      "authors": [{"name": "Bob"}],
                                      "articleids": []
                                    }
                                  }
                                }
                                """;
                            }
                            if (uri.getPath().endsWith("/efetch.fcgi")) {
                                return """
                                <PubmedArticleSet>
                                  <PubmedArticle>
                                    <MedlineCitation>
                                      <PMID>100</PMID>
                                      <Article>
                                        <Abstract>
                                          <AbstractText Label="BACKGROUND">First abstract.</AbstractText>
                                        </Abstract>
                                      </Article>
                                    </MedlineCitation>
                                  </PubmedArticle>
                                  <PubmedArticle>
                                    <MedlineCitation>
                                      <PMID>200</PMID>
                                      <Article>
                                        <Abstract>
                                          <AbstractText>Second abstract.</AbstractText>
                                        </Abstract>
                                      </Article>
                                    </MedlineCitation>
                                  </PubmedArticle>
                                </PubmedArticleSet>
                                """;
                            }
                            throw new AssertionError("Unexpected URI: " + uri);
                        });

        PubmedService.SearchResult result = service.search("user-a", "lung cancer", 50);

        assertEquals(3, calledUris.size());
        assertEquals(
                List.of("100", "200"),
                result.records().stream().map(PubmedRecord::getPmid).toList());
        assertEquals("BACKGROUND: First abstract.", result.records().get(0).getAbstractText());
        assertEquals("10.100/example", result.records().get(0).getDoi());

        ArgumentCaptor<PubmedSearch> searchCaptor = ArgumentCaptor.forClass(PubmedSearch.class);
        verify(searchRepository).save(searchCaptor.capture());
        PubmedSearch savedSearch = searchCaptor.getValue();
        assertEquals("lung cancer", savedSearch.getQueryText());
        assertEquals("user-a", savedSearch.getUserId());
        assertEquals(50, savedSearch.getRetmax());
        assertEquals(2L, savedSearch.getTotalCount());
        assertEquals(List.of("100", "200"), savedSearch.getPmids());
        assertEquals(1L, savedSearch.getHitCount());

        verify(recordRepository, times(2)).save(any(PubmedRecord.class));
    }

    @Test
    void sameUserSecondRequestInsideFiveSecondsReturns429BeforeCacheLookup() {
        UserRateLimiter realRateLimiter = new UserRateLimiter(FIXED_CLOCK, Duration.ofSeconds(5));
        service =
                new PubmedService(
                        recordRepository,
                        searchRepository,
                        realRateLimiter,
                        restOperations,
                        new ObjectMapper(),
                        FIXED_CLOCK,
                        "https://ncbi.example.test/entrez/eutils");

        PubmedSearch cached =
                PubmedSearch.builder()
                        .queryHash("query-hash")
                        .queryText("lung cancer")
                        .userId("user-a")
                        .retmax(50)
                        .totalCount(1L)
                        .pmids(List.of("100"))
                        .hitCount(1L)
                        .build();
        when(searchRepository.findByQueryHash(anyString())).thenReturn(Optional.of(cached));
        when(recordRepository.findByPmidIn(any()))
                .thenReturn(List.of(record("100", "First title")));

        service.search("user-a", "lung cancer", 50);
        BusinessException error =
                assertThrows(
                        BusinessException.class, () -> service.search("user-a", "lung cancer", 50));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        assertEquals("RATE_LIMITED", error.getCode());
        verify(searchRepository, times(1)).findByQueryHash(anyString());
        verify(recordRepository, times(1)).findByPmidIn(any());
        verify(restOperations, never()).getForObject(any(URI.class), eq(String.class));
    }

    private static PubmedRecord record(String pmid, String title) {
        return PubmedRecord.builder().pmid(pmid).title(title).build();
    }
}
