package com.alibaba.himarket.dto.result.agent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentArtifactResult {

    private String id;

    private String taskId;

    private String path;

    private String mimeType;

    private Long size;

    private String sha256;

    private String downloadUrl;
}
