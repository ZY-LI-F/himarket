package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.dto.params.agent.StartTaskParam;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import com.alibaba.himarket.service.agent.AgentTaskRunService;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AgentTaskRunServiceImpl implements AgentTaskRunService {

    private static final String NOT_IMPLEMENTED = "not implemented yet — T08";

    @Override
    public List<AgentTaskRunSummaryResult> listTasks(String userId, String roomId) {
        throw notImplemented();
    }

    @Override
    public AgentStartTaskResult startTask(String userId, String roomId, StartTaskParam param) {
        throw notImplemented();
    }

    @Override
    public AgentTaskRunResult getTask(String userId, String roomId, String taskId) {
        throw notImplemented();
    }

    @Override
    public String streamTaskEvents(String userId, String roomId, String taskId) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(NOT_IMPLEMENTED);
    }
}
