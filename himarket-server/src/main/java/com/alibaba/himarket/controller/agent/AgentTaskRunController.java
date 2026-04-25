package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.dto.params.agent.StartTaskParam;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent/rooms/{id}/tasks")
@Validated
@DeveloperAuth
public class AgentTaskRunController {

    @GetMapping
    public List<AgentTaskRunSummaryResult> listTasks(@PathVariable String id) {
        return AgentStubResponses.stubResponse(
                userId -> List.of(AgentStubResponses.taskSummary(id, "task-stub")));
    }

    @PostMapping
    public AgentStartTaskResult startTask(
            @PathVariable String id, @Valid @RequestBody StartTaskParam param) {
        return AgentStubResponses.stubResponse(userId -> AgentStubResponses.startTask());
    }

    @GetMapping("/{taskId}")
    public AgentTaskRunResult getTask(@PathVariable String id, @PathVariable String taskId) {
        return AgentStubResponses.stubResponse(userId -> AgentStubResponses.taskRun(id, taskId));
    }

    @GetMapping(value = "/{taskId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<String> streamTaskEvents(
            @PathVariable String id, @PathVariable String taskId) {
        String body =
                AgentStubResponses.stubResponse(
                        userId -> AgentStubResponses.taskEventStream(id, taskId));
        return ResponseEntity.ok().contentType(MediaType.TEXT_EVENT_STREAM).body(body);
    }
}
