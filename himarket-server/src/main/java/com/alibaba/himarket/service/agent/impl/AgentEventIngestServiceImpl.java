package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.service.agent.AgentEventIngestService;
import com.alibaba.himarket.service.agent.AgentTaskRunService;
import com.alibaba.himarket.service.agent.TaskEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Uses a process-local capped LinkedHashMap for webhook dedupe. This MVP suppresses bridge retries
 * for active server processes without introducing a schema migration; restart replay is out of
 * scope for T15.
 */
@Service
@RequiredArgsConstructor
public class AgentEventIngestServiceImpl implements AgentEventIngestService {

    private static final int MAX_RECENT_KEYS = 10_000;
    private static final String DEDUPE_SEPARATOR = "\u0000";
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final AgentTaskRunService taskRunService;
    private final ObjectMapper objectMapper;
    private final Map<String, Boolean> recentEventKeys = new LinkedHashMap<>(16, 0.75f, true);

    @Override
    public IngestResult ingest(byte[] body, String idempotencyKey) {
        if (!StringUtils.hasText(idempotencyKey)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "missing X-Idempotency-Key");
        }

        ParsedWebhookEvent parsed = parse(body);
        String normalizedIdempotencyKey = idempotencyKey.trim();
        String dedupeKey = parsed.taskId() + DEDUPE_SEPARATOR + normalizedIdempotencyKey;

        synchronized (recentEventKeys) {
            if (Boolean.TRUE.equals(recentEventKeys.get(dedupeKey))) {
                return IngestResult.duplicate(parsed.taskId());
            }
            taskRunService.appendTaskEvent(parsed.taskId(), parsed.event());
            remember(dedupeKey);
            return IngestResult.accepted(parsed.taskId());
        }
    }

    private ParsedWebhookEvent parse(byte[] body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            if (root == null || !root.isObject()) {
                throw invalidRequest("webhook body must be a JSON object");
            }

            JsonNode payloadNode = requiredObject(root, "payload");
            String taskId = firstText(root, "taskId", "task_id");
            if (!StringUtils.hasText(taskId)) {
                taskId = firstText(payloadNode, "taskId", "task_id");
            }
            if (!StringUtils.hasText(taskId)) {
                throw invalidRequest("webhook event task_id is required");
            }

            TaskEvent event =
                    TaskEvent.builder()
                            .seq(optionalInteger(root, "seq"))
                            .kind(requiredText(root, "kind"))
                            .agentId(firstText(root, "agentId", "agent_id"))
                            .payload(objectMapper.convertValue(payloadNode, MAP_TYPE))
                            .timestamp(parseTimestamp(requiredText(root, "timestamp")))
                            .build();
            return new ParsedWebhookEvent(taskId, event);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, e, "invalid webhook JSON");
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, e, "invalid webhook JSON");
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, e, e.getMessage());
        }
    }

    private JsonNode requiredObject(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        if (value == null || value.isNull() || !value.isObject()) {
            throw invalidRequest("webhook event " + fieldName + " must be a JSON object");
        }
        return value;
    }

    private String requiredText(JsonNode node, String fieldName) {
        String value = firstText(node, fieldName);
        if (!StringUtils.hasText(value)) {
            throw invalidRequest("webhook event " + fieldName + " is required");
        }
        return value;
    }

    private String firstText(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode value = node.get(fieldName);
            if (value != null && value.isTextual() && StringUtils.hasText(value.asText())) {
                return value.asText();
            }
        }
        return null;
    }

    private Integer optionalInteger(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isInt()) {
            throw invalidRequest("webhook event " + fieldName + " must be an integer");
        }
        return value.intValue();
    }

    private LocalDateTime parseTimestamp(String raw) {
        try {
            return OffsetDateTime.parse(raw, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                    .toLocalDateTime();
        } catch (DateTimeParseException e) {
            try {
                return LocalDateTime.parse(raw, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (DateTimeParseException nested) {
                throw new BusinessException(
                        ErrorCode.INVALID_REQUEST, nested, "invalid webhook event timestamp");
            }
        }
    }

    private void remember(String dedupeKey) {
        recentEventKeys.put(dedupeKey, Boolean.TRUE);
        while (recentEventKeys.size() > MAX_RECENT_KEYS) {
            Iterator<String> iterator = recentEventKeys.keySet().iterator();
            iterator.next();
            iterator.remove();
        }
    }

    private BusinessException invalidRequest(String message) {
        return new BusinessException(ErrorCode.INVALID_REQUEST, message);
    }

    private record ParsedWebhookEvent(String taskId, TaskEvent event) {}
}
