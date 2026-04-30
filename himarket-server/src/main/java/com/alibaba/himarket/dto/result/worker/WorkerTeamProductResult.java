package com.alibaba.himarket.dto.result.worker;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkerTeamProductResult {

    private String productId;

    private String name;

    private String version;

    private String businessDomain;

    private String description;

    private String status;

    private String visibility;

    private JsonNode pricing;

    private List<String> tags;

    private List<WorkerTeamProductMemberResult> members;

    private LocalDateTime createAt;

    private LocalDateTime updatedAt;
}
