package com.alibaba.himarket.dto.result.agent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentBindingRefResult {

    private String productId;

    private String version;

    private String status;
}
