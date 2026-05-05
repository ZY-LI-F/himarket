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

package com.alibaba.himarket.api.v1.projects;

import com.alibaba.himarket.core.annotation.AdminOrDeveloperAuth;
import com.alibaba.himarket.entity.WritingProject;
import com.alibaba.himarket.service.ProjectService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@AdminOrDeveloperAuth
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public WritingProject createProject(@RequestBody SaveProjectRequest request) {
        return projectService.create(request.toCommand());
    }

    @GetMapping
    public List<WritingProject> listProjects(
            @RequestParam(required = false) String spec,
            @RequestParam(required = false) String version) {
        return projectService.list(spec, version);
    }

    @GetMapping("/{projectId}")
    public WritingProject getProject(@PathVariable String projectId) {
        return projectService.get(projectId);
    }

    @PutMapping("/{projectId}")
    public WritingProject updateProject(
            @PathVariable String projectId, @RequestBody SaveProjectRequest request) {
        return projectService.update(projectId, request.toCommand());
    }

    @DeleteMapping("/{projectId}")
    public void deleteProject(@PathVariable String projectId) {
        projectService.delete(projectId);
    }

    @GetMapping("/{projectId}/chapters")
    public List<Map<String, Object>> listChapters(@PathVariable String projectId) {
        return projectService.listChapters(projectId);
    }

    @PostMapping("/{projectId}/_dispatch")
    public ProjectService.ActionResult dispatchProject(
            @PathVariable String projectId,
            @RequestBody(required = false) DispatchProjectRequest request) {
        return projectService.dispatch(projectId, request == null ? null : request.toCommand());
    }

    @PostMapping("/{projectId}/_assemble")
    public ProjectService.AssembleResult assembleProject(@PathVariable String projectId) {
        return projectService.assemble(projectId);
    }

    @PostMapping("/{projectId}/_regenerate")
    public ProjectService.ActionResult regenerateProject(
            @PathVariable String projectId,
            @RequestBody(required = false) RegenerateProjectRequest request) {
        return projectService.regenerate(projectId, request == null ? null : request.toCommand());
    }

    public record SaveProjectRequest(
            String title,
            String spec,
            String version,
            String roomId,
            String teamTemplateId,
            String prompt,
            List<Map<String, Object>> chapters) {

        ProjectService.SaveCommand toCommand() {
            return new ProjectService.SaveCommand(
                    title, spec, version, roomId, teamTemplateId, prompt, chapters);
        }
    }

    public record DispatchProjectRequest(String roomId, String teamTemplateId, String prompt) {

        ProjectService.DispatchCommand toCommand() {
            return new ProjectService.DispatchCommand(roomId, teamTemplateId, prompt);
        }
    }

    public record RegenerateProjectRequest(
            String roomId, String teamTemplateId, String chapterId, String prompt) {

        ProjectService.RegenerateCommand toCommand() {
            return new ProjectService.RegenerateCommand(roomId, teamTemplateId, chapterId, prompt);
        }
    }
}
