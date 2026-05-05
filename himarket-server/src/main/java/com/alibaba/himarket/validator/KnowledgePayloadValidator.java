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

package com.alibaba.himarket.validator;

import cn.hutool.core.util.StrUtil;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class KnowledgePayloadValidator {

    private static final String DOC_REVIEW_CATEGORY = "doc_review";
    private static final String DOC_REVIEW_KIND = "DocReviewRule";
    private static final Set<String> DOC_REVIEW_PROPERTIES = Set.of("key", "condition", "checks");

    public void validate(String kind, String category, Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            throw invalid("payload must be a non-empty JSON object");
        }
        if (DOC_REVIEW_CATEGORY.equals(category)) {
            validateDocReviewRule(kind, payload);
            return;
        }
        throw invalid("Unsupported knowledge payload schema: " + kind + "/" + category);
    }

    private static void validateDocReviewRule(String kind, Map<String, Object> payload) {
        if (!DOC_REVIEW_KIND.equals(kind)) {
            throw invalid("doc_review payload requires kind " + DOC_REVIEW_KIND);
        }
        rejectUnknownProperties(payload);
        requireString(payload, "key");
        requireString(payload, "condition");
        requireStringList(payload, "checks");
    }

    private static void rejectUnknownProperties(Map<String, Object> payload) {
        for (String property : payload.keySet()) {
            if (!DOC_REVIEW_PROPERTIES.contains(property)) {
                throw invalid("payload contains unsupported property: " + property);
            }
        }
    }

    private static void requireString(Map<String, Object> payload, String property) {
        Object value = payload.get(property);
        if (!(value instanceof String text) || StrUtil.isBlank(text)) {
            throw invalid("payload." + property + " must be a non-empty string");
        }
    }

    private static void requireStringList(Map<String, Object> payload, String property) {
        Object value = payload.get(property);
        if (!(value instanceof List<?> items) || items.isEmpty()) {
            throw invalid("payload." + property + " must be a non-empty string array");
        }
        for (Object item : items) {
            if (!(item instanceof String text) || StrUtil.isBlank(text)) {
                throw invalid("payload." + property + " must contain only non-empty strings");
            }
        }
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.INVALID_PARAMETER, message);
    }
}
