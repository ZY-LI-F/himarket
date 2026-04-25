package com.alibaba.himarket.controller.agent;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ResponseAdvice;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentTaskRunController.class)
@Import({ResponseAdvice.class, AgentControllerSmokeTestSupport.TestSecurityConfig.class})
class AgentTaskRunControllerSmokeTest extends AgentControllerSmokeTestSupport {

    @Autowired private MockMvc mockMvc;

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/tasks"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void taskEndpointsReturnTaskShapes() throws Exception {
        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/tasks").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").isString())
                .andExpect(jsonPath("$.data[0].status").value("RUNNING"))
                .andExpect(jsonPath("$.data[0].createdAt").isString());

        mockMvc.perform(
                        post("/api/v1/agent/rooms/room-stub/tasks")
                                .with(developer())
                                .contentType(json())
                                .content(TASK_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.taskId").isString())
                .andExpect(jsonPath("$.data.status").value("RUNNING"));

        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/tasks/task-stub").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.events").isArray())
                .andExpect(jsonPath("$.data.events[0].seq").isNumber())
                .andExpect(jsonPath("$.data.events[0].payload").isMap())
                .andExpect(jsonPath("$.data.artifacts").isArray())
                .andExpect(jsonPath("$.data.artifacts[0].sha256").isString());

        mockMvc.perform(
                        get("/api/v1/agent/rooms/room-stub/tasks/task-stub/stream")
                                .with(developer()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(content().string(containsString("event: log")))
                .andExpect(content().string(containsString("\"kind\":\"log\"")));
    }
}
