package com.alibaba.himarket.service.agent;

import com.alibaba.himarket.dto.params.agent.StartTaskParam;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import java.util.List;

public interface AgentTaskRunService {

    List<AgentTaskRunSummaryResult> listTasks(String userId, String roomId);

    AgentStartTaskResult startTask(String userId, String roomId, StartTaskParam param);

    AgentTaskRunResult getTask(String userId, String roomId, String taskId);

    String streamTaskEvents(String userId, String roomId, String taskId);
}
