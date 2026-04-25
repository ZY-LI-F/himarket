package com.alibaba.himarket.dto.converter.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

final class AgentJsonConverter {

    private AgentJsonConverter() {}

    static <T> T readRequired(ObjectMapper objectMapper, String json, Class<T> type) {
        if (json == null || json.isBlank()) {
            throw new IllegalArgumentException("missing JSON for " + type.getSimpleName());
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("invalid JSON for " + type.getSimpleName(), e);
        }
    }

    static <T> T readRequired(
            ObjectMapper objectMapper, String json, TypeReference<T> type, String targetName) {
        if (json == null || json.isBlank()) {
            throw new IllegalArgumentException("missing JSON for " + targetName);
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("invalid JSON for " + targetName, e);
        }
    }

    static Map<String, Object> readOptionalMap(ObjectMapper objectMapper, String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        return readRequired(
                objectMapper, json, new TypeReference<Map<String, Object>>() {}, "TaskRun.plan");
    }
}
