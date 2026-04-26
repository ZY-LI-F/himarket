package com.alibaba.himarket.controller.agent;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ResponseAdvice;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskEventResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import com.alibaba.himarket.service.agent.AgentTaskRunService;
import com.alibaba.himarket.service.agent.TaskEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import reactor.core.publisher.Flux;

@WebMvcTest(AgentTaskRunController.class)
@Import({ResponseAdvice.class, AgentControllerSmokeTestSupport.TestSecurityConfig.class})
class AgentTaskRunControllerSmokeTest extends AgentControllerSmokeTestSupport {

    private static final LocalDateTime NOW = LocalDateTime.parse("2026-01-01T00:00:00");

    @Autowired private MockMvc mockMvc;
    @MockBean private AgentTaskRunService taskRunService;

    @BeforeEach
    void setUpService() {
        whenListTask();
        whenStartTask();
        whenGetTask();
        whenStreamTask();
    }

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
                .andExpect(jsonPath("$.data[0].id").value("task-stub"))
                .andExpect(jsonPath("$.data[0].status").value("RUNNING"))
                .andExpect(jsonPath("$.data[0].createdAt").isString());

        mockMvc.perform(
                        post("/api/v1/agent/rooms/room-stub/tasks")
                                .with(developer())
                                .contentType(json())
                                .content(TASK_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.taskId").value("task-stub"))
                .andExpect(jsonPath("$.data.status").value("RUNNING"));

        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/tasks/task-stub").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.events").isArray())
                .andExpect(jsonPath("$.data.events[0].seq").isNumber())
                .andExpect(jsonPath("$.data.events[0].payload").isMap())
                .andExpect(jsonPath("$.data.artifacts").isArray());

        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/tasks/task-failed").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("FAILED"))
                .andExpect(jsonPath("$.data.failureExcerpt").value("mock stderr"));
    }

    @Test
    void streamEndpointReturnsSseEvents() throws Exception {
        MvcResult result =
                mockMvc.perform(
                                get("/api/v1/agent/rooms/room-stub/tasks/task-stub/stream")
                                        .with(developer()))
                        .andExpect(request().asyncStarted())
                        .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(content().string(containsString("\"kind\":\"log\"")))
                .andExpect(content().string(containsString("mock task event")));
    }

    private void whenListTask() {
        org.mockito.Mockito.when(taskRunService.listTasks(eq("agent-user"), eq("room-stub")))
                .thenReturn(
                        List.of(
                                AgentTaskRunSummaryResult.builder()
                                        .id("task-stub")
                                        .roomId("room-stub")
                                        .status("RUNNING")
                                        .prompt("Summarize the workspace")
                                        .createdAt(NOW)
                                        .build()));
    }

    private void whenStartTask() {
        org.mockito.Mockito.when(taskRunService.startTask(eq("agent-user"), eq("room-stub"), any()))
                .thenReturn(
                        AgentStartTaskResult.builder()
                                .taskId("task-stub")
                                .status("RUNNING")
                                .build());
    }

    private void whenGetTask() {
        org.mockito.Mockito.when(
                        taskRunService.getTask(eq("agent-user"), eq("room-stub"), eq("task-stub")))
                .thenReturn(
                        AgentTaskRunResult.builder()
                                .id("task-stub")
                                .roomId("room-stub")
                                .status("RUNNING")
                                .prompt("Summarize the workspace")
                                .events(List.of(taskEventResult("log", Map.of("message", "ok"))))
                                .artifacts(List.of())
                                .createdAt(NOW)
                                .build());
        org.mockito.Mockito.when(
                        taskRunService.getTask(
                                eq("agent-user"), eq("room-stub"), eq("task-failed")))
                .thenReturn(
                        AgentTaskRunResult.builder()
                                .id("task-failed")
                                .roomId("room-stub")
                                .status("FAILED")
                                .prompt("fail")
                                .events(
                                        List.of(
                                                taskEventResult(
                                                        "task.failed",
                                                        Map.of("stderr", "mock stderr"))))
                                .artifacts(List.of())
                                .failureExcerpt("mock stderr")
                                .createdAt(NOW)
                                .completedAt(NOW)
                                .build());
    }

    private void whenStreamTask() {
        org.mockito.Mockito.when(
                        taskRunService.streamTaskEvents(
                                eq("agent-user"), eq("room-stub"), eq("task-stub")))
                .thenReturn(
                        Flux.just(
                                TaskEvent.builder()
                                        .seq(0)
                                        .kind("log")
                                        .agentId("manager")
                                        .payload(Map.of("message", "mock task event"))
                                        .timestamp(NOW)
                                        .build()));
    }

    private AgentTaskEventResult taskEventResult(String kind, Map<String, Object> payload) {
        return AgentTaskEventResult.builder()
                .seq(0)
                .kind(kind)
                .agentId("manager")
                .payload(payload)
                .timestamp(NOW)
                .build();
    }
}
