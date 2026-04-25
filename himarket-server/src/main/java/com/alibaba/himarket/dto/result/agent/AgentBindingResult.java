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
public class AgentBindingResult {

    private String id;

    private String roomId;

    private String kind;

    private String productId;

    private String version;

    private String status;

    private LocalDateTime createdAt;
}
