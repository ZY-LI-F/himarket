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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.entity.PubmedRecord;
import com.alibaba.himarket.service.PubmedService;
import java.security.Principal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PubmedControllerTest {

    @Test
    void searchDelegatesToServiceAndReturnsControllerResponse() throws Exception {
        PubmedService service = mock(PubmedService.class);
        PubmedRecord record = record("100", "First title");
        when(service.search("user-a", "lung cancer", 50))
                .thenReturn(
                        new PubmedService.SearchResult(
                                "user-a",
                                "lung cancer",
                                50,
                                2L,
                                false,
                                1L,
                                List.of("100"),
                                List.of(record)));

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new PubmedController(service)).build();

        mockMvc.perform(
                        post("/api/v1/pubmed/search")
                                .principal(principal("user-a"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "query": "lung cancer",
                                          "retmax": 50
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("lung cancer"))
                .andExpect(jsonPath("$.retmax").value(50))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.totalCount").value(2))
                .andExpect(jsonPath("$.returned").value(1))
                .andExpect(jsonPath("$.records[0].pmid").value("100"))
                .andExpect(jsonPath("$.records[0].pub_date").value("2024 Jan"))
                .andExpect(jsonPath("$.records[0].abstract").value("Abstract text."));

        verify(service).search("user-a", "lung cancer", 50);
    }

    @Test
    void getRecordReturnsCachedOrFetchedPubmedRecord() throws Exception {
        PubmedService service = mock(PubmedService.class);
        when(service.fetchByPmid("user-a", "100")).thenReturn(record("100", "First title"));

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new PubmedController(service)).build();

        mockMvc.perform(get("/api/v1/pubmed/records/100").principal(principal("user-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pmid").value("100"))
                .andExpect(jsonPath("$.title").value("First title"));

        verify(service).fetchByPmid("user-a", "100");
    }

    @Test
    void attachAsAttachmentReturnsProjectScopedPubmedDescriptor() throws Exception {
        PubmedService service = mock(PubmedService.class);
        when(service.fetchByPmid("user-a", "100")).thenReturn(record("100", "First title"));

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new PubmedController(service)).build();

        mockMvc.perform(
                        post("/api/v1/pubmed/records/100/_attach")
                                .principal(principal("user-a"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "projectId": "project-1"
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value("project-1"))
                .andExpect(jsonPath("$.project_id").value("project-1"))
                .andExpect(jsonPath("$.sourceType").value("pubmed"))
                .andExpect(jsonPath("$.pmid").value("100"))
                .andExpect(jsonPath("$.attachmentId").value("pubmed-100"))
                .andExpect(jsonPath("$.name").value("pubmed-100.md"))
                .andExpect(jsonPath("$.record.title").value("First title"));

        verify(service).fetchByPmid("user-a", "100");
    }

    private static Principal principal(String name) {
        return () -> name;
    }

    private static PubmedRecord record(String pmid, String title) {
        return PubmedRecord.builder()
                .pmid(pmid)
                .title(title)
                .authors(List.of("Alice"))
                .journal("Journal A")
                .pubDate("2024 Jan")
                .abstractText("Abstract text.")
                .doi("10.100/example")
                .build();
    }
}
