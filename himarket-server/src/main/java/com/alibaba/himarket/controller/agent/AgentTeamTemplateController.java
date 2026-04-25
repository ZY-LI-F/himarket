package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.dto.result.agent.AgentTeamTemplateResult;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent/team-templates")
@Validated
@DeveloperAuth
public class AgentTeamTemplateController {

    @GetMapping
    public List<AgentTeamTemplateResult> listTeamTemplates() {
        return AgentStubResponses.stubResponse(
                userId -> List.of(AgentStubResponses.teamTemplate("team-template-stub")));
    }

    @GetMapping("/{id}")
    public AgentTeamTemplateResult getTeamTemplate(@PathVariable String id) {
        return AgentStubResponses.stubResponse(userId -> AgentStubResponses.teamTemplate(id));
    }
}
