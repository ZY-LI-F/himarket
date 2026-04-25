package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.result.agent.AgentArtifactResult;
import com.alibaba.himarket.dto.result.agent.AgentBindingRefResult;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import com.alibaba.himarket.dto.result.agent.AgentProfileRefResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomPermissionResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskEventResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import com.alibaba.himarket.dto.result.agent.AgentTeamTemplateResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

final class AgentStubResponses {

    private static final String DEFAULT_WORKSPACE_ID = "ws-stub";
    private static final String DEFAULT_TASK_ID = "task-stub";
    private static final String DEFAULT_TEMPLATE_ID = "team-template-stub";
    private static final String DEFAULT_MODEL_ID = "qwen-plus";
    private static final String ACTIVE_STATUS = "ACTIVE";
    private static final String RUNNING_STATUS = "RUNNING";
    private static final int FIRST_PAGE = 0;
    private static final int SINGLE_ITEM_COUNT = 1;
    private static final int EVENT_SEQUENCE = 0;
    private static final long ARTIFACT_SIZE_BYTES = 128L;
    private static final LocalDateTime FIXED_TIME = LocalDateTime.parse("2026-01-01T00:00:00");
    private static final String FIXED_TIME_TEXT = "2026-01-01T00:00:00";
    private static final String STUB_SHA256 =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    private AgentStubResponses() {}

    static <T> T stubResponse(Function<String, T> fixtureFactory) {
        return fixtureFactory.apply(currentUserId());
    }

    static AgentWorkspacePageResult workspacePage(String userId) {
        return AgentWorkspacePageResult.builder()
                .content(List.of(workspace(DEFAULT_WORKSPACE_ID, userId)))
                .totalElements((long) SINGLE_ITEM_COUNT)
                .totalPages(SINGLE_ITEM_COUNT)
                .size(SINGLE_ITEM_COUNT)
                .number(FIRST_PAGE)
                .first(Boolean.TRUE)
                .last(Boolean.TRUE)
                .build();
    }

    static AgentWorkspaceResult workspace(String workspaceId, String userId) {
        return AgentWorkspaceResult.builder()
                .id(workspaceId)
                .name("Stub Workspace")
                .description("Canned workspace for frontend integration")
                .ownerId(userId)
                .defaultTeamTemplateId(DEFAULT_TEMPLATE_ID)
                .active(Boolean.TRUE)
                .createdAt(FIXED_TIME)
                .updatedAt(FIXED_TIME)
                .build();
    }

    static AgentRoomResult room(String workspaceId, String roomId, String userId) {
        return AgentRoomResult.builder()
                .id(roomId)
                .workspaceId(workspaceId)
                .name("Stub Room")
                .modelId(DEFAULT_MODEL_ID)
                .teamTemplateId(DEFAULT_TEMPLATE_ID)
                .fileRoot("/workspaces/" + workspaceId + "/rooms/" + roomId)
                .permission(permission(userId))
                .createdAt(FIXED_TIME)
                .updatedAt(FIXED_TIME)
                .build();
    }

    static AgentRoomConfigResult roomConfig(String roomId, String userId) {
        return AgentRoomConfigResult.builder()
                .roomId(roomId)
                .modelId(DEFAULT_MODEL_ID)
                .teamTemplateId(DEFAULT_TEMPLATE_ID)
                .skillBindings(List.of(bindingRef("skill-code-review")))
                .mcpBindings(List.of(bindingRef("mcp-filesystem")))
                .permission(permission(userId))
                .build();
    }

    static AgentBindingResult binding(String roomId) {
        return AgentBindingResult.builder()
                .id("binding-stub")
                .roomId(roomId)
                .kind("SKILL")
                .productId("skill-code-review")
                .version("1.0.0")
                .status(ACTIVE_STATUS)
                .createdAt(FIXED_TIME)
                .build();
    }

    static AgentStartTaskResult startTask() {
        return AgentStartTaskResult.builder()
                .taskId(DEFAULT_TASK_ID)
                .status(RUNNING_STATUS)
                .build();
    }

    static AgentTaskRunSummaryResult taskSummary(String roomId, String taskId) {
        return AgentTaskRunSummaryResult.builder()
                .id(taskId)
                .roomId(roomId)
                .status(RUNNING_STATUS)
                .prompt("Summarize the workspace")
                .createdAt(FIXED_TIME)
                .build();
    }

    static AgentTaskRunResult taskRun(String roomId, String taskId) {
        return AgentTaskRunResult.builder()
                .id(taskId)
                .roomId(roomId)
                .status(RUNNING_STATUS)
                .prompt("Summarize the workspace")
                .plan(Map.of("steps", List.of("inspect", "summarize")))
                .events(List.of(taskEvent()))
                .artifacts(List.of(artifact(taskId)))
                .createdAt(FIXED_TIME)
                .build();
    }

    static String taskEventStream(String roomId, String taskId) {
        return "event: log\n"
                + "data: {\"seq\":0,\"kind\":\"log\",\"agentId\":\"manager\","
                + "\"payload\":{\"roomId\":\""
                + roomId
                + "\",\"taskId\":\""
                + taskId
                + "\"},\"timestamp\":\""
                + FIXED_TIME_TEXT
                + "\"}\n\n";
    }

    static AgentTeamTemplateResult teamTemplate(String templateId) {
        return AgentTeamTemplateResult.builder()
                .id(templateId)
                .name("Stub Team")
                .version("1.0.0")
                .manager(profile("manager", "manager"))
                .workers(List.of(profile("worker-code", "developer")))
                .defaultSkills(List.of("skill-code-review"))
                .defaultMcps(List.of("mcp-filesystem"))
                .build();
    }

    static Void noContent(String userId) {
        return null;
    }

    private static String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户未认证");
        }
        return authentication.getName();
    }

    private static AgentRoomPermissionResult permission(String userId) {
        return AgentRoomPermissionResult.builder()
                .readonly(Boolean.FALSE)
                .allowedUserIds(List.of(userId))
                .build();
    }

    private static AgentBindingRefResult bindingRef(String productId) {
        return AgentBindingRefResult.builder()
                .productId(productId)
                .version("1.0.0")
                .status(ACTIVE_STATUS)
                .build();
    }

    private static AgentTaskEventResult taskEvent() {
        return AgentTaskEventResult.builder()
                .seq(EVENT_SEQUENCE)
                .kind("log")
                .agentId("manager")
                .payload(Map.of("message", "stub task event"))
                .timestamp(FIXED_TIME)
                .build();
    }

    private static AgentArtifactResult artifact(String taskId) {
        return AgentArtifactResult.builder()
                .id("artifact-stub")
                .taskId(taskId)
                .path("summary.md")
                .mimeType("text/markdown")
                .size(ARTIFACT_SIZE_BYTES)
                .sha256(STUB_SHA256)
                .downloadUrl("/api/v1/agent/artifacts/artifact-stub/download")
                .build();
    }

    private static AgentProfileRefResult profile(String id, String role) {
        return AgentProfileRefResult.builder()
                .id(id)
                .role(role)
                .model(DEFAULT_MODEL_ID)
                .systemPromptDigest("sha256:" + STUB_SHA256)
                .build();
    }
}
