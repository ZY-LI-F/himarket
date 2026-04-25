package com.alibaba.himarket.dto.result.agent;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentTaskRunSummaryResult {

    private String id;

    private String roomId;

    private String status;

    private String prompt;

    private String failureExcerpt;

    private LocalDateTime createdAt;

    private LocalDateTime completedAt;
}
