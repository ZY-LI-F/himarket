package com.alibaba.himarket.service.agent;

import com.alibaba.himarket.dto.result.agent.AgentTeamTemplateResult;
import java.util.List;

public interface AgentTeamTemplateService {

    List<AgentTeamTemplateResult> listTeamTemplates(String userId);

    AgentTeamTemplateResult getTeamTemplate(String userId, String templateId);
}
