package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.dto.params.agent.CreateBindingParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import com.alibaba.himarket.service.agent.AgentBindingService;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AgentBindingServiceImpl implements AgentBindingService {

    private static final String NOT_IMPLEMENTED = "not implemented yet — T08";

    @Override
    public List<AgentBindingResult> listBindings(String userId, String roomId) {
        throw notImplemented();
    }

    @Override
    public AgentBindingResult createBinding(
            String userId, String roomId, CreateBindingParam param) {
        throw notImplemented();
    }

    @Override
    public void deleteBinding(String userId, String bindingId) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(NOT_IMPLEMENTED);
    }
}
