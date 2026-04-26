package com.alibaba.himarket.service.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.alibaba.himarket.service.agent.AgentEventIngestService.IngestResult;
import com.alibaba.himarket.service.agent.impl.AgentEventIngestServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AgentEventIngestServiceImplTest {

    private static final String IDEMPOTENCY_KEY = "room-123:$event-1";
    private static final String BODY =
            "{\"seq\":3,\"kind\":\"task.completed\","
                    + "\"payload\":{\"task_id\":\"task-1\",\"status\":\"completed\"},"
                    + "\"agentId\":\"worker-dev\",\"timestamp\":\"2026-04-26T10:30:00Z\"}";

    private final AgentTaskRunService taskRunService = mock(AgentTaskRunService.class);
    private final AgentEventIngestServiceImpl ingestService =
            new AgentEventIngestServiceImpl(taskRunService, new ObjectMapper());

    @Test
    void bridgePayloadAppendsTaskEventToTaskRunService() {
        IngestResult result = ingestService.ingest(bytes(BODY), IDEMPOTENCY_KEY);

        assertThat(result.duplicate()).isFalse();
        assertThat(result.taskId()).isEqualTo("task-1");

        ArgumentCaptor<TaskEvent> eventCaptor = ArgumentCaptor.forClass(TaskEvent.class);
        verify(taskRunService).appendTaskEvent(eq("task-1"), eventCaptor.capture());
        TaskEvent event = eventCaptor.getValue();
        assertThat(event.getSeq()).isEqualTo(3);
        assertThat(event.getKind()).isEqualTo("task.completed");
        assertThat(event.getAgentId()).isEqualTo("worker-dev");
        assertThat(event.getPayload()).containsEntry("status", "completed");
        assertThat(event.getTimestamp()).isEqualTo(LocalDateTime.parse("2026-04-26T10:30:00"));
    }

    @Test
    void duplicateIdempotencyKeyForSameTaskIsNoop() {
        ingestService.ingest(bytes(BODY), IDEMPOTENCY_KEY);

        IngestResult duplicate = ingestService.ingest(bytes(BODY), IDEMPOTENCY_KEY);

        assertThat(duplicate.duplicate()).isTrue();
        assertThat(duplicate.taskId()).isEqualTo("task-1");
        verify(taskRunService, times(1)).appendTaskEvent(eq("task-1"), org.mockito.Mockito.any());
    }

    private byte[] bytes(String body) {
        return body.getBytes(StandardCharsets.UTF_8);
    }
}
