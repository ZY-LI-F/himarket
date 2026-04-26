package com.alibaba.himarket.service.agent;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

public interface HiClawBridgeClient {

    String submitTask(TaskSubmitRequest request);

    Flux<TaskEvent> streamEvents(String taskId);

    record TaskSubmitRequest(
            String clientTaskId,
            String userId,
            String roomId,
            String prompt,
            List<String> files,
            String mode) {}
}

final class WebClientHiClawBridgeClient implements HiClawBridgeClient {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_BODY =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<ServerSentEvent<TaskEvent>> TASK_EVENT_SSE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;

    WebClientHiClawBridgeClient(WebClient webClient) {
        this.webClient = webClient;
    }

    @Override
    public String submitTask(TaskSubmitRequest request) {
        Map<String, Object> response =
                webClient
                        .post()
                        .uri("/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .bodyValue(request)
                        .retrieve()
                        .bodyToMono(MAP_BODY)
                        .block();
        if (response == null) {
            throw new IllegalStateException("HiClaw bridge POST /v1/tasks returned an empty body");
        }
        Object taskId = response.getOrDefault("taskId", response.get("task_id"));
        if (taskId == null || !StringUtils.hasText(taskId.toString())) {
            throw new IllegalStateException("HiClaw bridge POST /v1/tasks returned no taskId");
        }
        return taskId.toString();
    }

    @Override
    public Flux<TaskEvent> streamEvents(String taskId) {
        return webClient
                .get()
                .uri("/v1/tasks/{taskId}/events", taskId)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .bodyToFlux(TASK_EVENT_SSE)
                .map(ServerSentEvent::data)
                .filter(Objects::nonNull);
    }
}
