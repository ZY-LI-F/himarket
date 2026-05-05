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

package com.alibaba.himarket.api.v1.projects;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.bridge.HiclawDispatchClient;
import com.alibaba.himarket.entity.WritingProject;
import com.alibaba.himarket.repository.WritingProjectRepository;
import com.alibaba.himarket.service.ProjectService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ProjectControllerTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Test
    void createProjectThenDispatchSendsStructuredBridgeRequest() throws Exception {
        TestHarness harness = newHarness();
        when(harness.dispatchClient.dispatch(any()))
                .thenReturn(new HiclawDispatchClient.DispatchResponse("task-test-1", "pending"));

        MvcResult createResult =
                harness.mockMvc
                        .perform(
                                post("/api/v1/projects")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "title": "ICH E3 CSR",
                                                  "spec": "ich e3",
                                                  "version": "baseline",
                                                  "roomId": "room-123",
                                                  "teamTemplateId": "dev-team-v1",
                                                  "prompt": "Draft the clinical study report.",
                                                  "chapters": [
                                                    {
                                                      "id": "1",
                                                      "title": "Synopsis",
                                                      "prompt": "Draft the synopsis."
                                                    }
                                                  ]
                                                }
                                                """))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.id", startsWith("project-")))
                        .andExpect(jsonPath("$.spec").value("ICH-E3"))
                        .andExpect(jsonPath("$.status").value("draft"))
                        .andExpect(jsonPath("$.chapters", hasSize(1)))
                        .andReturn();

        String projectId = projectId(createResult);

        harness.mockMvc
                .perform(
                        post("/api/v1/projects/{projectId}/_dispatch", projectId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("dispatch"))
                .andExpect(jsonPath("$.projectId").value(projectId))
                .andExpect(jsonPath("$.taskId").value("task-test-1"))
                .andExpect(jsonPath("$.status").value("pending"));

        ArgumentCaptor<HiclawDispatchClient.DispatchRequest> captor =
                ArgumentCaptor.forClass(HiclawDispatchClient.DispatchRequest.class);
        verify(harness.dispatchClient).dispatch(captor.capture());

        HiclawDispatchClient.DispatchRequest request = captor.getValue();
        assertEquals("room-123", request.roomId());
        assertEquals("dev-team-v1", request.teamTemplateId());
        assertTrue(request.prompt().contains("Action: dispatch_writing_project"));
        assertTrue(request.prompt().contains("Project ID: " + projectId));
        assertTrue(request.prompt().contains("Title: ICH E3 CSR"));
        assertTrue(request.prompt().contains("- [1] Synopsis :: Draft the synopsis."));
        assertEquals("dispatched", harness.storedProject.get().getStatus());
        assertEquals("task-test-1", harness.storedProject.get().getLastTaskId());
    }

    @Test
    void listsChaptersAndSupportsAssembleAndRegenerateActions() throws Exception {
        TestHarness harness = newHarness();
        when(harness.dispatchClient.dispatch(any()))
                .thenReturn(
                        new HiclawDispatchClient.DispatchResponse("task-regenerate-1", "pending"));

        MvcResult createResult =
                harness.mockMvc
                        .perform(
                                post("/api/v1/projects")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "title": "ICH E3 CSR",
                                                  "spec": "ICH-E3",
                                                  "roomId": "room-123",
                                                  "teamTemplateId": "dev-team-v1",
                                                  "prompt": "Draft the clinical study report.",
                                                  "chapters": [
                                                    {
                                                      "id": "1",
                                                      "title": "Synopsis",
                                                      "content": "Existing synopsis content."
                                                    }
                                                  ]
                                                }
                                                """))
                        .andExpect(status().isOk())
                        .andReturn();

        String projectId = projectId(createResult);

        harness.mockMvc
                .perform(get("/api/v1/projects/{projectId}/chapters", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("1"))
                .andExpect(jsonPath("$[0].title").value("Synopsis"));

        harness.mockMvc
                .perform(post("/api/v1/projects/{projectId}/_assemble", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("assemble"))
                .andExpect(jsonPath("$.status").value("assembled"))
                .andExpect(jsonPath("$.document", containsString("## Synopsis")))
                .andExpect(jsonPath("$.document", containsString("Existing synopsis content.")));

        harness.mockMvc
                .perform(
                        post("/api/v1/projects/{projectId}/_regenerate", projectId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "chapterId": "1",
                                          "prompt": "Rewrite the synopsis with tighter wording."
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("regenerate"))
                .andExpect(jsonPath("$.chapterId").value("1"))
                .andExpect(jsonPath("$.taskId").value("task-regenerate-1"));

        ArgumentCaptor<HiclawDispatchClient.DispatchRequest> captor =
                ArgumentCaptor.forClass(HiclawDispatchClient.DispatchRequest.class);
        verify(harness.dispatchClient).dispatch(captor.capture());
        assertTrue(
                captor.getValue().prompt().contains("Action: regenerate_writing_project_chapter"));
        assertTrue(captor.getValue().prompt().contains("Chapter ID: 1"));
        assertEquals("regenerating", harness.storedProject.get().getStatus());
    }

    private static TestHarness newHarness() {
        WritingProjectRepository repository = mock(WritingProjectRepository.class);
        HiclawDispatchClient dispatchClient = mock(HiclawDispatchClient.class);
        AtomicReference<WritingProject> storedProject = new AtomicReference<>();

        when(repository.save(any(WritingProject.class)))
                .thenAnswer(
                        invocation -> {
                            WritingProject project = invocation.getArgument(0);
                            storedProject.set(project);
                            return project;
                        });
        when(repository.findById(any()))
                .thenAnswer(
                        invocation -> {
                            WritingProject project = storedProject.get();
                            if (project == null) {
                                return Optional.empty();
                            }
                            return project.getId().equals(invocation.getArgument(0))
                                    ? Optional.of(project)
                                    : Optional.empty();
                        });

        ProjectService service = new ProjectService(repository, dispatchClient);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ProjectController(service)).build();
        return new TestHarness(mockMvc, dispatchClient, storedProject);
    }

    private static String projectId(MvcResult result) throws Exception {
        JsonNode body = OBJECT_MAPPER.readTree(result.getResponse().getContentAsString());
        return body.get("id").asText();
    }

    private record TestHarness(
            MockMvc mockMvc,
            HiclawDispatchClient dispatchClient,
            AtomicReference<WritingProject> storedProject) {}
}
