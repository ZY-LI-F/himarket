package com.alibaba.himarket.dto.result.agent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentProfileRefResult {

    private String id;

    private String role;

    private String model;

    private String systemPromptDigest;
}
