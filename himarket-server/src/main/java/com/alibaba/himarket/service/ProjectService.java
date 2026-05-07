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

package com.alibaba.himarket.service;

import com.alibaba.himarket.bridge.HiclawDispatchClient;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.entity.IchTemplate;
import com.alibaba.himarket.entity.WritingProject;
import com.alibaba.himarket.repository.WritingProjectRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProjectService {

    private static final String RESOURCE_NAME = "WritingProject";
    private static final String ID_PREFIX = "project-";
    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_DISPATCHED = "dispatched";
    private static final String STATUS_ASSEMBLED = "assembled";
    private static final String STATUS_REGENERATING = "regenerating";

    private final WritingProjectRepository repository;
    private final HiclawDispatchClient dispatchClient;
    private final Clock clock;

    @Autowired
    public ProjectService(
            WritingProjectRepository repository, HiclawDispatchClient dispatchClient) {
        this(repository, dispatchClient, Clock.systemDefaultZone());
    }

    ProjectService(
            WritingProjectRepository repository, HiclawDispatchClient dispatchClient, Clock clock) {
        this.repository = Objects.requireNonNull(repository, "repository must not be null");
        this.dispatchClient =
                Objects.requireNonNull(dispatchClient, "dispatchClient must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    public WritingProject create(SaveCommand command) {
        ValidatedCommand validated = validate(command);
        WritingProject project =
                WritingProject.builder()
                        .id(IdGenerator.genIdWithPrefix(ID_PREFIX))
                        .title(validated.title())
                        .spec(validated.spec())
                        .version(validated.version())
                        .roomId(validated.roomId())
                        .teamTemplateId(validated.teamTemplateId())
                        .prompt(validated.prompt())
                        .status(STATUS_DRAFT)
                        .chapters(validated.chapters())
                        .build();
        return repository.save(project);
    }

    @Transactional(readOnly = true)
    public List<WritingProject> list(String spec, String version) {
        String normalizedSpec = optionalText(spec);
        String normalizedVersion = optionalText(version);
        if (normalizedSpec == null) {
            return repository.findAll(Sort.by(Sort.Direction.DESC, "createAt"));
        }
        return repository.findBySpecAndVersionOrderByCreateAtDescTitleAsc(
                IchTemplate.normalizeSpec(normalizedSpec),
                normalizedVersion == null ? IchTemplate.DEFAULT_VERSION : normalizedVersion);
    }

    @Transactional(readOnly = true)
    public WritingProject get(String id) {
        return findExisting(id);
    }

    public WritingProject update(String id, SaveCommand command) {
        WritingProject project = findExisting(id);
        ValidatedCommand validated = validate(command);
        project.setTitle(validated.title());
        project.setSpec(validated.spec());
        project.setVersion(validated.version());
        project.setRoomId(validated.roomId());
        project.setTeamTemplateId(validated.teamTemplateId());
        project.setPrompt(validated.prompt());
        project.setChapters(validated.chapters());
        return repository.save(project);
    }

    public void delete(String id) {
        WritingProject project = findExisting(id);
        repository.delete(project);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listChapters(String id) {
        return copyChapters(findExisting(id).getChapters());
    }

    public ActionResult dispatch(String id, DispatchCommand command) {
        WritingProject project = findExisting(id);
        DispatchCommand safeCommand = command == null ? DispatchCommand.empty() : command;
        HiclawDispatchClient.DispatchResponse response =
                dispatchClient.dispatch(
                        new HiclawDispatchClient.DispatchRequest(
                                resolveRoomId(project, safeCommand.roomId()),
                                buildDispatchPrompt(
                                        "dispatch_writing_project",
                                        project,
                                        optionalText(safeCommand.prompt())),
                                resolveTeamTemplateId(project, safeCommand.teamTemplateId())));
        project.setStatus(STATUS_DISPATCHED);
        project.setLastTaskId(response.taskId());
        project.setLastDispatchedAt(LocalDateTime.now(clock));
        repository.save(project);
        return new ActionResult(
                "dispatch", project.getId(), response.taskId(), response.status(), null);
    }

    public AssembleResult assemble(String id) {
        WritingProject project = findExisting(id);
        String document = assembleDocument(project);
        project.setAssembledDocument(document);
        project.setStatus(STATUS_ASSEMBLED);
        repository.save(project);
        return new AssembleResult("assemble", project.getId(), STATUS_ASSEMBLED, document);
    }

    public ActionResult regenerate(String id, RegenerateCommand command) {
        WritingProject project = findExisting(id);
        RegenerateCommand safeCommand = command == null ? RegenerateCommand.empty() : command;
        String chapterId = optionalText(safeCommand.chapterId());
        if (chapterId != null && findChapter(project, chapterId) == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "chapter", chapterId);
        }
        HiclawDispatchClient.DispatchResponse response =
                dispatchClient.dispatch(
                        new HiclawDispatchClient.DispatchRequest(
                                resolveRoomId(project, safeCommand.roomId()),
                                buildRegeneratePrompt(project, chapterId, safeCommand.prompt()),
                                resolveTeamTemplateId(project, safeCommand.teamTemplateId())));
        project.setStatus(STATUS_REGENERATING);
        project.setLastTaskId(response.taskId());
        project.setLastDispatchedAt(LocalDateTime.now(clock));
        repository.save(project);
        return new ActionResult(
                "regenerate", project.getId(), response.taskId(), response.status(), chapterId);
    }

    private ValidatedCommand validate(SaveCommand command) {
        if (command == null) {
            throw invalid("project command must not be null");
        }
        String title = requireText(command.title(), "title");
        String spec = IchTemplate.normalizeSpec(requireText(command.spec(), "spec"));
        String version =
                optionalText(command.version()) == null
                        ? IchTemplate.DEFAULT_VERSION
                        : optionalText(command.version());
        return new ValidatedCommand(
                title,
                spec,
                version,
                optionalText(command.roomId()),
                optionalText(command.teamTemplateId()),
                optionalText(command.prompt()),
                normalizeChapters(command.chapters()));
    }

    private WritingProject findExisting(String id) {
        String normalizedId = requireText(id, "id");
        return repository
                .findById(normalizedId)
                .orElseThrow(
                        () ->
                                new BusinessException(
                                        ErrorCode.NOT_FOUND, RESOURCE_NAME, normalizedId));
    }

    private String resolveRoomId(WritingProject project, String requestedRoomId) {
        String roomId = optionalText(requestedRoomId);
        if (roomId != null) {
            return roomId;
        }
        return requireText(project.getRoomId(), "roomId");
    }

    private String resolveTeamTemplateId(WritingProject project, String requestedTeamTemplateId) {
        String teamTemplateId = optionalText(requestedTeamTemplateId);
        if (teamTemplateId != null) {
            return teamTemplateId;
        }
        return requireText(project.getTeamTemplateId(), "teamTemplateId");
    }

    private String buildDispatchPrompt(
            String action, WritingProject project, String requestedPrompt) {
        String instructions =
                requestedPrompt == null
                        ? requireText(project.getPrompt(), "prompt")
                        : requestedPrompt;
        StringBuilder builder = new StringBuilder();
        builder.append("Action: ").append(action).append('\n');
        appendProjectHeader(builder, project);
        builder.append("Instructions:\n").append(instructions).append('\n');
        appendChapters(builder, project.getChapters());
        return builder.toString();
    }

    private String buildRegeneratePrompt(
            WritingProject project, String chapterId, String requestedPrompt) {
        String instructions = requireText(requestedPrompt, "prompt");
        StringBuilder builder = new StringBuilder();
        builder.append("Action: regenerate_writing_project");
        if (chapterId != null) {
            builder.append("_chapter");
        }
        builder.append('\n');
        appendProjectHeader(builder, project);
        if (chapterId != null) {
            Map<String, Object> chapter = findChapter(project, chapterId);
            builder.append("Chapter ID: ").append(chapterId).append('\n');
            builder.append("Chapter Title: ").append(chapter.get("title")).append('\n');
        }
        builder.append("Instructions:\n").append(instructions).append('\n');
        return builder.toString();
    }

    private static void appendProjectHeader(StringBuilder builder, WritingProject project) {
        builder.append("Project ID: ").append(project.getId()).append('\n');
        builder.append("Title: ").append(project.getTitle()).append('\n');
        builder.append("Spec: ").append(project.getSpec()).append('\n');
        builder.append("Version: ").append(project.getVersion()).append('\n');
    }

    private static void appendChapters(StringBuilder builder, List<Map<String, Object>> chapters) {
        builder.append("Chapters:\n");
        for (Map<String, Object> chapter : copyChapters(chapters)) {
            builder.append("- [")
                    .append(chapter.get("id"))
                    .append("] ")
                    .append(chapter.get("title"));
            String prompt = optionalMapText(chapter, "prompt");
            if (prompt != null) {
                builder.append(" :: ").append(prompt);
            }
            builder.append('\n');
        }
    }

    private String assembleDocument(WritingProject project) {
        List<String> sections = new ArrayList<>();
        for (Map<String, Object> chapter : copyChapters(project.getChapters())) {
            String content = optionalMapText(chapter, "content");
            if (content != null) {
                sections.add("## " + chapter.get("title") + "\n\n" + content);
            }
        }
        if (sections.isEmpty()) {
            throw invalid("project has no chapter content to assemble");
        }
        return String.join("\n\n", sections);
    }

    private static Map<String, Object> findChapter(WritingProject project, String chapterId) {
        for (Map<String, Object> chapter : copyChapters(project.getChapters())) {
            if (chapterId.equals(chapter.get("id"))) {
                return chapter;
            }
        }
        return null;
    }

    private static List<Map<String, Object>> normalizeChapters(List<Map<String, Object>> chapters) {
        if (chapters == null) {
            return List.of();
        }
        List<Map<String, Object>> normalized = new ArrayList<>(chapters.size());
        for (int i = 0; i < chapters.size(); i++) {
            Map<String, Object> raw = chapters.get(i);
            if (raw == null) {
                throw invalid("chapters[" + i + "] must not be null");
            }
            String id = optionalObjectText(raw.get("id"), "chapters[" + i + "].id");
            String title =
                    requireText(
                            objectText(raw.get("title"), "chapters[" + i + "].title"),
                            "chapters[" + i + "].title");
            Map<String, Object> chapter = new LinkedHashMap<>();
            chapter.put("id", id == null ? String.valueOf(i + 1) : id);
            chapter.put("title", title);
            putOptionalText(chapter, "prompt", raw.get("prompt"), "chapters[" + i + "].prompt");
            putOptionalText(chapter, "status", raw.get("status"), "chapters[" + i + "].status");
            putOptionalText(chapter, "content", raw.get("content"), "chapters[" + i + "].content");
            normalized.add(Map.copyOf(chapter));
        }
        return List.copyOf(normalized);
    }

    private static List<Map<String, Object>> copyChapters(List<Map<String, Object>> chapters) {
        if (chapters == null || chapters.isEmpty()) {
            return List.of();
        }
        List<Map<String, Object>> copied = new ArrayList<>(chapters.size());
        for (Map<String, Object> chapter : chapters) {
            copied.add(Map.copyOf(chapter));
        }
        return List.copyOf(copied);
    }

    private static void putOptionalText(
            Map<String, Object> target, String key, Object value, String field) {
        String text = optionalObjectText(value, field);
        if (text != null) {
            target.put(key, text);
        }
    }

    private static String optionalMapText(Map<String, Object> map, String key) {
        return optionalObjectText(map.get(key), key);
    }

    private static String objectText(Object value, String field) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text;
        }
        throw invalid(field + " must be a string");
    }

    private static String optionalObjectText(Object value, String field) {
        return optionalText(objectText(value, field));
    }

    private static String requireText(String value, String field) {
        String normalized = optionalText(value);
        if (normalized == null) {
            throw invalid(field + " must not be blank");
        }
        return normalized;
    }

    private static String optionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.INVALID_PARAMETER, message);
    }

    public record SaveCommand(
            String title,
            String spec,
            String version,
            String roomId,
            String teamTemplateId,
            String prompt,
            List<Map<String, Object>> chapters) {}

    public record DispatchCommand(String roomId, String teamTemplateId, String prompt) {

        static DispatchCommand empty() {
            return new DispatchCommand(null, null, null);
        }
    }

    public record RegenerateCommand(
            String roomId, String teamTemplateId, String chapterId, String prompt) {

        static RegenerateCommand empty() {
            return new RegenerateCommand(null, null, null, null);
        }
    }

    public record ActionResult(
            String action, String projectId, String taskId, String status, String chapterId) {}

    public record AssembleResult(String action, String projectId, String status, String document) {}

    private record ValidatedCommand(
            String title,
            String spec,
            String version,
            String roomId,
            String teamTemplateId,
            String prompt,
            List<Map<String, Object>> chapters) {}
}
