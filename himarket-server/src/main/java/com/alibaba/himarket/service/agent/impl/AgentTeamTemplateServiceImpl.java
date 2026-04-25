package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.dto.result.agent.AgentTeamTemplateResult;
import com.alibaba.himarket.service.agent.AgentTeamTemplateService;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AgentTeamTemplateServiceImpl implements AgentTeamTemplateService {

    private static final String NOT_IMPLEMENTED = "not implemented yet — T08";

    @Override
    public List<AgentTeamTemplateResult> listTeamTemplates(String userId) {
        throw notImplemented();
    }

    @Override
    public AgentTeamTemplateResult getTeamTemplate(String userId, String templateId) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(NOT_IMPLEMENTED);
    }
}
