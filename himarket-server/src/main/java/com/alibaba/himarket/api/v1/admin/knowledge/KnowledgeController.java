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

package com.alibaba.himarket.api.v1.admin.knowledge;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.security.ContextHolder;
import com.alibaba.himarket.entity.KnowledgeAsset;
import com.alibaba.himarket.service.KnowledgeService;
import com.alibaba.himarket.validator.KnowledgePayloadValidator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/knowledge")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasRole('DEVELOPER')")
public class KnowledgeController {

    private static final String DOC_REVIEW_CATEGORY = "doc_review";
    private static final String DOC_REVIEW_KIND = "DocReviewRule";

    private final KnowledgeService knowledgeService;
    private final KnowledgePayloadValidator payloadValidator;
    private final ContextHolder contextHolder;

    @GetMapping("/schema")
    public RjsfSchemaResponse getSchema(@RequestParam String kind, @RequestParam String category) {
        requireSupportedSchema(kind, category);
        return new RjsfSchemaResponse(DOC_REVIEW_CATEGORY, DOC_REVIEW_KIND, schema(), uiSchema());
    }

    @PostMapping("/validate")
    public ValidationResponse validate(@RequestBody ValidationRequest request) {
        if (request == null) {
            throw invalid("request body must not be null");
        }
        payloadValidator.validate(request.kind(), request.category(), request.payload());
        return new ValidationResponse(true);
    }

    @PostMapping
    public KnowledgeAsset create(@RequestBody SaveRequest request) {
        if (request == null) {
            throw invalid("request body must not be null");
        }
        return knowledgeService.create(actor(), request.toCommand());
    }

    @GetMapping("/{id}")
    public KnowledgeAsset get(@PathVariable String id) {
        return knowledgeService.get(actor(), id);
    }

    @GetMapping
    public List<KnowledgeAsset> list(@RequestParam String scope, @RequestParam String category) {
        return knowledgeService.list(actor(), scope, category);
    }

    @PutMapping("/{id}")
    public KnowledgeAsset update(
            @PathVariable String id,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatchEtag,
            @RequestBody SaveRequest request) {
        if (request == null) {
            throw invalid("request body must not be null");
        }
        return knowledgeService.update(actor(), id, ifMatchEtag, request.toCommand());
    }

    @DeleteMapping("/{id}")
    public KnowledgeAsset delete(
            @PathVariable String id,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatchEtag) {
        return knowledgeService.delete(actor(), id, ifMatchEtag);
    }

    private KnowledgeService.Actor actor() {
        String userId = contextHolder.getUser();
        if (contextHolder.isAdministrator()) {
            return KnowledgeService.Actor.administrator(userId);
        }
        return KnowledgeService.Actor.developer(userId, Set.of());
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.INVALID_PARAMETER, message);
    }

    private static void requireSupportedSchema(String kind, String category) {
        if (!DOC_REVIEW_KIND.equals(kind) || !DOC_REVIEW_CATEGORY.equals(category)) {
            throw invalid("Unsupported knowledge payload schema: " + kind + "/" + category);
        }
    }

    private static Map<String, Object> schema() {
        Map<String, Object> schema = orderedMap();
        schema.put("$schema", "https://json-schema.org/draft/2020-12/schema");
        schema.put("title", "Knowledge asset");
        schema.put("type", "object");
        schema.put("required", List.of("kind", "category", "name", "scope", "payload", "enabled"));

        Map<String, Object> properties = orderedMap();
        properties.put("kind", stringEnum("Kind", List.of(DOC_REVIEW_KIND), DOC_REVIEW_KIND));
        properties.put(
                "category",
                stringEnum("Category", List.of(DOC_REVIEW_CATEGORY), DOC_REVIEW_CATEGORY));
        properties.put("name", stringField("Name", "Stable knowledge asset name."));
        properties.put("scope", stringEnum("Scope", List.of("global", "team", "user"), "user"));
        properties.put("teamId", stringField("Team ID", "Required when scope is team."));
        properties.put("userId", stringField("User ID", "Required when scope is user."));
        properties.put(
                "inheritsFrom",
                stringField("Inherits from", "Optional parent knowledge asset name."));
        properties.put(
                "applicableWorkers",
                arrayOfString("Applicable workers", "Workers that should consume this asset."));
        properties.put(
                "severity",
                stringEnum("Severity", List.of("info", "minor", "major", "critical"), "major"));
        properties.put("domain", stringField("Domain", "Knowledge domain."));
        properties.put("description", textField("Description"));
        properties.put("payload", docReviewPayloadSchema());
        properties.put("enabled", booleanField("Enabled", true));
        schema.put("properties", properties);
        schema.put("additionalProperties", false);
        return schema;
    }

    private static Map<String, Object> docReviewPayloadSchema() {
        Map<String, Object> payload = orderedMap();
        payload.put("title", "Document review rule payload");
        payload.put("type", "object");
        payload.put("required", List.of("key", "condition", "checks"));

        Map<String, Object> properties = orderedMap();
        properties.put("key", stringField("Key", "Rule key."));
        properties.put("condition", textField("Condition"));
        properties.put("checks", arrayOfString("Checks", "Checks enforced by the rule."));
        payload.put("properties", properties);
        payload.put("additionalProperties", false);
        return payload;
    }

    private static Map<String, Object> uiSchema() {
        Map<String, Object> uiSchema = orderedMap();
        uiSchema.put("kind", Map.of("ui:widget", "hidden"));
        uiSchema.put("category", Map.of("ui:widget", "hidden"));
        uiSchema.put("description", Map.of("ui:widget", "textarea"));
        uiSchema.put("payload", Map.of("condition", Map.of("ui:widget", "textarea")));
        return uiSchema;
    }

    private static Map<String, Object> stringField(String title, String description) {
        Map<String, Object> field = orderedMap();
        field.put("type", "string");
        field.put("title", title);
        field.put("description", description);
        field.put("minLength", 1);
        return field;
    }

    private static Map<String, Object> textField(String title) {
        Map<String, Object> field = stringField(title, title);
        field.put("ui:widget", "textarea");
        return field;
    }

    private static Map<String, Object> stringEnum(
            String title, List<String> values, String defaultValue) {
        Map<String, Object> field = orderedMap();
        field.put("type", "string");
        field.put("title", title);
        field.put("enum", values);
        field.put("default", defaultValue);
        return field;
    }

    private static Map<String, Object> arrayOfString(String title, String description) {
        Map<String, Object> field = orderedMap();
        field.put("type", "array");
        field.put("title", title);
        field.put("description", description);
        field.put("items", Map.of("type", "string", "minLength", 1));
        field.put("uniqueItems", true);
        return field;
    }

    private static Map<String, Object> booleanField(String title, boolean defaultValue) {
        Map<String, Object> field = orderedMap();
        field.put("type", "boolean");
        field.put("title", title);
        field.put("default", defaultValue);
        return field;
    }

    private static Map<String, Object> orderedMap() {
        return new LinkedHashMap<>();
    }

    public record SaveRequest(
            String kind,
            String category,
            String name,
            String scope,
            String teamId,
            String userId,
            String inheritsFrom,
            List<String> applicableWorkers,
            String severity,
            String domain,
            String description,
            Map<String, Object> payload,
            Boolean enabled) {

        private KnowledgeService.SaveCommand toCommand() {
            return new KnowledgeService.SaveCommand(
                    kind,
                    category,
                    name,
                    scope,
                    teamId,
                    userId,
                    inheritsFrom,
                    applicableWorkers,
                    severity,
                    domain,
                    description,
                    payload,
                    enabled);
        }
    }

    public record ValidationRequest(String kind, String category, Map<String, Object> payload) {}

    public record ValidationResponse(boolean valid) {}

    public record RjsfSchemaResponse(
            String category,
            String kind,
            Map<String, Object> schema,
            Map<String, Object> uiSchema) {

        public RjsfSchemaResponse {
            schema = Map.copyOf(schema);
            uiSchema = Map.copyOf(uiSchema);
        }
    }
}
