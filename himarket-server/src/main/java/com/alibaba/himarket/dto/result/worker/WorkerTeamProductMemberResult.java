package com.alibaba.himarket.dto.result.worker;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkerTeamProductMemberResult {

    private String role;

    private String refName;

    private String refVersion;

    private Integer ordinal;
}
