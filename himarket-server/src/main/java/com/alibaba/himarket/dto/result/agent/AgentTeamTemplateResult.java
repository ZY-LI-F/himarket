package com.alibaba.himarket.dto.result.agent;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentTeamTemplateResult {

    private String id;

    private String name;

    private String version;

    private AgentProfileRefResult manager;

    private List<AgentProfileRefResult> workers;

    private List<String> defaultSkills;

    private List<String> defaultMcps;
}
