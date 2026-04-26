package com.alibaba.himarket.service.agent;

import static org.assertj.core.api.Assertions.assertThat;

import com.alibaba.himarket.dto.params.agent.StartTaskParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import reactor.core.publisher.Mono;
import reactor.util.function.Tuple2;

class AgentTaskRunServiceIT extends AgentServiceITSupport {

    @Autowired private AgentWorkspaceService workspaceService;
    @Autowired private AgentRoomService roomService;
    @Autowired private AgentTaskRunService taskRunService;

    @Test
    void happyPathEmitsFourEventsToConcurrentSubscribers() {
        AgentRoomResult room = createRoom("Happy Room");
        AgentStartTaskResult started =
                taskRunService.startTask(USER_ID, room.getId(), taskParam("summarize workspace"));

        Mono<List<TaskEvent>> first =
                taskRunService
                        .streamTaskEvents(USER_ID, room.getId(), started.getTaskId())
                        .collectList();
        Mono<List<TaskEvent>> second =
                taskRunService
                        .streamTaskEvents(USER_ID, room.getId(), started.getTaskId())
                        .collectList();

        Tuple2<List<TaskEvent>, List<TaskEvent>> both =
                Mono.zip(first, second).block(Duration.ofSeconds(5));
        assertThat(both).isNotNull();
        assertThat(both.getT1()).hasSize(4);
        assertThat(both.getT2()).hasSize(4);
        assertThat(both.getT1())
                .extracting(TaskEvent::getKind)
                .containsExactly("log", "plan", "worker.assigned", "task.completed");
        assertThat(both.getT2())
                .extracting(TaskEvent::getKind)
                .containsExactly("log", "plan", "worker.assigned", "task.completed");

        AgentTaskRunResult stored =
                taskRunService.getTask(USER_ID, room.getId(), started.getTaskId());
        assertThat(stored.getStatus()).isEqualTo("SUCCEEDED");
        assertThat(stored.getEvents()).hasSize(4);
    }

    @Test
    void bridgeFailureEventPersistsFailedStatusAndFailureExcerpt() {
        AgentRoomResult room = createRoom("Failure Room");
        AgentStartTaskResult started =
                taskRunService.startTask(USER_ID, room.getId(), taskParam("please fail this task"));

        List<TaskEvent> events =
                taskRunService
                        .streamTaskEvents(USER_ID, room.getId(), started.getTaskId())
                        .collectList()
                        .block(Duration.ofSeconds(5));
        assertThat(events).isNotNull();
        assertThat(events).extracting(TaskEvent::getKind).contains("task.failed");

        AgentTaskRunResult stored =
                taskRunService.getTask(USER_ID, room.getId(), started.getTaskId());
        assertThat(stored.getStatus()).isEqualTo("FAILED");
        assertThat(stored.getFailureExcerpt()).contains("mock stderr");
        assertThat(
                        taskRunRepository
                                .findByTaskUid(started.getTaskId())
                                .orElseThrow()
                                .getEventsJson())
                .contains("task.failed");
    }

    private AgentRoomResult createRoom(String name) {
        AgentWorkspaceResult workspace =
                workspaceService.createWorkspace(
                        USER_ID, createWorkspaceParam(name + " Workspace"));
        return roomService.createRoom(USER_ID, workspace.getId(), createRoomParam(name));
    }

    private StartTaskParam taskParam(String prompt) {
        StartTaskParam param = new StartTaskParam();
        param.setPrompt(prompt);
        param.setFiles(List.of("README.md"));
        param.setMode("task");
        return param;
    }
}
