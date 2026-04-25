package com.alibaba.himarket.service.agent;

import com.alibaba.himarket.dto.params.agent.CreateBindingParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import java.util.List;

public interface AgentBindingService {

    List<AgentBindingResult> listBindings(String userId, String roomId);

    AgentBindingResult createBinding(String userId, String roomId, CreateBindingParam param);

    void deleteBinding(String userId, String bindingId);
}
