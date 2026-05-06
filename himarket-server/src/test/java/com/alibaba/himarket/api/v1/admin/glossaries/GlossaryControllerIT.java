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

package com.alibaba.himarket.api.v1.admin.glossaries;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ExceptionAdvice;
import com.alibaba.himarket.core.advice.ResponseAdvice;
import com.alibaba.himarket.entity.Glossary;
import com.alibaba.himarket.repository.GlossaryRepository;
import com.alibaba.himarket.service.GlossaryService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:glossary_controller;MODE=MySQL;"
                    + "DATABASE_TO_LOWER=TRUE;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.jpa.hibernate.ddl-auto=create-drop"
        })
@AutoConfigureMockMvc(addFilters = false)
@ContextConfiguration(classes = GlossaryControllerIT.TestApplication.class)
class GlossaryControllerIT {

    private final MockMvc mockMvc;

    GlossaryControllerIT(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    @Test
    void lookupAliasMatchesTermTranslationAndAliasesBidirectionally() throws Exception {
        String payload =
                """
                {
                  "term": "智能体",
                  "translation": "Agent",
                  "aliases": ["AI Agent", "智能代理"],
                  "description": "Runtime actor"
                }
                """;

        mockMvc.perform(
                        post("/api/v1/admin/glossaries")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.term").value("智能体"));

        mockMvc.perform(get("/api/v1/admin/glossaries/lookup").param("alias", "ai agent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].term").value("智能体"))
                .andExpect(jsonPath("$.data[0].translation").value("Agent"));

        mockMvc.perform(get("/api/v1/admin/glossaries/lookup").param("alias", "智能体"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].term").value("智能体"));

        mockMvc.perform(get("/api/v1/admin/glossaries/lookup").param("alias", "Agent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].term").value("智能体"));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EntityScan(basePackageClasses = Glossary.class)
    @EnableJpaRepositories(
            basePackageClasses = GlossaryRepository.class,
            includeFilters =
                    @ComponentScan.Filter(
                            type = FilterType.ASSIGNABLE_TYPE,
                            classes = GlossaryRepository.class))
    @ComponentScan(
            basePackageClasses = {
                GlossaryController.class,
                GlossaryService.class,
                ResponseAdvice.class,
                ExceptionAdvice.class
            },
            includeFilters = {
                @ComponentScan.Filter(
                        type = FilterType.ASSIGNABLE_TYPE,
                        classes = {
                            GlossaryController.class,
                            GlossaryService.class,
                            ResponseAdvice.class,
                            ExceptionAdvice.class
                        })
            },
            useDefaultFilters = false)
    static class TestApplication {}
}
