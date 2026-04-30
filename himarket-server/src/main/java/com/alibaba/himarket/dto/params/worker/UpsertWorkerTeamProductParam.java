package com.alibaba.himarket.dto.params.worker;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class UpsertWorkerTeamProductParam {

    @NotBlank(message = "Worker team product id cannot be blank")
    @Size(max = 64, message = "Worker team product id cannot exceed 64 characters")
    private String productId;

    @NotBlank(message = "Worker team product name cannot be blank")
    @Size(max = 128, message = "Worker team product name cannot exceed 128 characters")
    private String name;

    @NotBlank(message = "Worker team product version cannot be blank")
    @Size(max = 64, message = "Worker team product version cannot exceed 64 characters")
    private String version;

    @Size(max = 128, message = "Worker team product business domain cannot exceed 128 characters")
    private String businessDomain;

    @Size(max = 1000, message = "Worker team product description cannot exceed 1000 characters")
    private String description;

    @NotBlank(message = "Worker team product status cannot be blank")
    @Size(max = 32, message = "Worker team product status cannot exceed 32 characters")
    private String status;

    @NotBlank(message = "Worker team product visibility cannot be blank")
    @Size(max = 32, message = "Worker team product visibility cannot exceed 32 characters")
    private String visibility;

    private JsonNode pricing;

    private List<
                    @Size(max = 64, message = "Worker team product tag cannot exceed 64 characters")
                    String>
            tags;

    @Valid private List<WorkerTeamProductMemberParam> members;
}
