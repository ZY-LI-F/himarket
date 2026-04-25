package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.dto.params.agent.CreateBindingParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent")
@Validated
@DeveloperAuth
public class AgentBindingController {

    @GetMapping("/rooms/{id}/bindings")
    public List<AgentBindingResult> listBindings(@PathVariable String id) {
        return AgentStubResponses.stubResponse(userId -> List.of(AgentStubResponses.binding(id)));
    }

    @PostMapping("/rooms/{id}/bindings")
    public AgentBindingResult createBinding(
            @PathVariable String id, @Valid @RequestBody CreateBindingParam param) {
        return AgentStubResponses.stubResponse(userId -> AgentStubResponses.binding(id));
    }

    @DeleteMapping("/bindings/{bindingId}")
    public void deleteBinding(@PathVariable String bindingId) {
        AgentStubResponses.stubResponse(AgentStubResponses::noContent);
    }
}
