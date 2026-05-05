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

package com.alibaba.himarket.bridge;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Duration;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestOperations;

public interface HiclawDispatchClient {

    DispatchResponse dispatch(DispatchRequest request);

    record DispatchRequest(
            @JsonProperty("room_id") String roomId,
            String prompt,
            @JsonProperty("team_template_id") String teamTemplateId) {}

    record DispatchResponse(@JsonProperty("task_id") String taskId, String status) {}
}

@Component
class HttpHiclawDispatchClient implements HiclawDispatchClient {

    private static final String TASKS_PATH = "/v1/tasks";

    private final RestOperations restOperations;
    private final String baseUrl;
    private final String bridgeToken;

    public HttpHiclawDispatchClient(
            RestTemplateBuilder builder,
            @Value("${hiclaw.bridge.base-url:${HICLAW_BRIDGE_BASE_URL:}}") String baseUrl,
            @Value("${hiclaw.bridge.token:${HICLAW_BRIDGE_TOKEN:}}") String bridgeToken) {
        this(
                builder.setConnectTimeout(Duration.ofSeconds(5))
                        .setReadTimeout(Duration.ofSeconds(20))
                        .build(),
                baseUrl,
                bridgeToken);
    }

    HttpHiclawDispatchClient(RestOperations restOperations, String baseUrl, String bridgeToken) {
        this.restOperations = Objects.requireNonNull(restOperations, "restOperations is required");
        this.baseUrl = trimToEmpty(baseUrl);
        this.bridgeToken = trimToEmpty(bridgeToken);
    }

    @Override
    public DispatchResponse dispatch(DispatchRequest request) {
        DispatchRequest validated = validate(request);
        assertConfigured();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(bridgeToken);
        HttpEntity<DispatchRequest> entity = new HttpEntity<>(validated, headers);

        try {
            ResponseEntity<DispatchResponse> response =
                    restOperations.exchange(
                            endpoint(), HttpMethod.POST, entity, DispatchResponse.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException(
                        ErrorCode.GATEWAY_ERROR,
                        "HiClaw bridge dispatch failed with HTTP " + response.getStatusCode());
            }
            DispatchResponse body = response.getBody();
            if (body == null || trimToEmpty(body.taskId()).isEmpty()) {
                throw new BusinessException(
                        ErrorCode.GATEWAY_ERROR, "HiClaw bridge response missing task_id");
            }
            return body;
        } catch (RestClientException e) {
            throw new BusinessException(
                    ErrorCode.GATEWAY_ERROR, e, "HiClaw bridge dispatch failed: " + e.getMessage());
        }
    }

    private DispatchRequest validate(DispatchRequest request) {
        if (request == null) {
            throw new BusinessException(
                    ErrorCode.INVALID_PARAMETER, "dispatch request is required");
        }
        String roomId = requireText(request.roomId(), "roomId");
        String prompt = requireText(request.prompt(), "prompt");
        String teamTemplateId = requireText(request.teamTemplateId(), "teamTemplateId");
        return new DispatchRequest(roomId, prompt, teamTemplateId);
    }

    private void assertConfigured() {
        if (baseUrl.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.INVALID_REQUEST, "hiclaw.bridge.base-url is required");
        }
        if (bridgeToken.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.INVALID_REQUEST, "hiclaw.bridge.token is required");
        }
    }

    private String endpoint() {
        String normalized =
                baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return normalized + TASKS_PATH;
    }

    private static String requireText(String value, String field) {
        String normalized = trimToEmpty(value);
        if (normalized.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, field + " must not be blank");
        }
        return normalized;
    }

    private static String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
