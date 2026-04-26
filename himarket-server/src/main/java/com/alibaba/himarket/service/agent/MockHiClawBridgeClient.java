package com.alibaba.himarket.service.agent;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import reactor.core.publisher.Flux;

public class MockHiClawBridgeClient implements HiClawBridgeClient {

    private static final Duration INITIAL_DELAY = Duration.ofMillis(100);
    private static final Duration EVENT_DELAY = Duration.ofMillis(10);
    private static final String FAILURE_TOKEN = "fail";

    private final ConcurrentMap<String, Boolean> failingTasks = new ConcurrentHashMap<>();

    @Override
    public String submitTask(TaskSubmitRequest request) {
        boolean failing =
                request.prompt() != null
                        && request.prompt().toLowerCase(Locale.ROOT).contains(FAILURE_TOKEN);
        failingTasks.put(request.clientTaskId(), failing);
        return request.clientTaskId();
    }

    @Override
    public Flux<TaskEvent> streamEvents(String taskId) {
        Flux<TaskEvent> events =
                Boolean.TRUE.equals(failingTasks.get(taskId)) ? failure(taskId) : happy(taskId);
        return events.delaySubscription(INITIAL_DELAY).delayElements(EVENT_DELAY);
    }

    private Flux<TaskEvent> happy(String taskId) {
        return Flux.fromIterable(
                List.of(
                        event(0, "log", taskId, Map.of("message", "mock task accepted")),
                        event(1, "plan", taskId, Map.of("steps", List.of("inspect", "summarize"))),
                        event(
                                2,
                                "worker.assigned",
                                taskId,
                                Map.of("workerId", "worker-code", "role", "developer")),
                        event(3, "task.completed", taskId, Map.of("result", "mock ok"))));
    }

    private Flux<TaskEvent> failure(String taskId) {
        return Flux.fromIterable(
                List.of(
                        event(0, "log", taskId, Map.of("message", "mock task accepted")),
                        event(
                                1,
                                "task.failed",
                                taskId,
                                Map.of("stderr", "mock stderr: bridge task failed"))));
    }

    private TaskEvent event(int seq, String kind, String taskId, Map<String, Object> payload) {
        return TaskEvent.builder()
                .seq(seq)
                .kind(kind)
                .agentId("manager")
                .payload(withTaskId(taskId, payload))
                .timestamp(LocalDateTime.now())
                .build();
    }

    private Map<String, Object> withTaskId(String taskId, Map<String, Object> payload) {
        Map<String, Object> result = new java.util.LinkedHashMap<>(payload);
        result.put("taskId", taskId);
        return result;
    }
}
