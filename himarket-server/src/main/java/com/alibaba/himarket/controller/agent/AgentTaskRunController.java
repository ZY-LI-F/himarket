package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.params.agent.StartTaskParam;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import com.alibaba.himarket.service.agent.AgentTaskRunService;
import com.alibaba.himarket.service.agent.TaskEvent;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/agent/rooms/{id}/tasks")
@Validated
@DeveloperAuth
@RequiredArgsConstructor
public class AgentTaskRunController {

    private final AgentTaskRunService taskRunService;

    @GetMapping
    public List<AgentTaskRunSummaryResult> listTasks(@PathVariable String id) {
        return taskRunService.listTasks(currentUserId(), id);
    }

    @PostMapping
    public AgentStartTaskResult startTask(
            @PathVariable String id, @Valid @RequestBody StartTaskParam param) {
        return taskRunService.startTask(currentUserId(), id, param);
    }

    @GetMapping("/{taskId}")
    public AgentTaskRunResult getTask(@PathVariable String id, @PathVariable String taskId) {
        return taskRunService.getTask(currentUserId(), id, taskId);
    }

    @GetMapping(value = "/{taskId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<TaskEvent> streamTaskEvents(@PathVariable String id, @PathVariable String taskId) {
        return taskRunService.streamTaskEvents(currentUserId(), id, taskId);
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户未认证");
        }
        return authentication.getName();
    }
}
