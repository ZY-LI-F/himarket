package com.alibaba.himarket.controller.admin;

import com.alibaba.himarket.core.annotation.AdminAuth;
import com.alibaba.himarket.dto.params.worker.UpsertWorkerTeamProductParam;
import com.alibaba.himarket.dto.result.common.PageResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductResult;
import com.alibaba.himarket.service.WorkerTeamProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/worker-team-products")
@AdminAuth
@Validated
@RequiredArgsConstructor
public class WorkerTeamProductAdminController {

    private final WorkerTeamProductService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkerTeamProductResult upsertWorkerTeamProduct(
            @Valid @RequestBody UpsertWorkerTeamProductParam param) {
        return service.upsertWorkerTeamProduct(param);
    }

    @GetMapping
    public PageResult<WorkerTeamProductResult> listWorkerTeamProducts(Pageable pageable) {
        return service.listWorkerTeamProducts(pageable);
    }

    @GetMapping("/{productId}")
    public WorkerTeamProductResult getWorkerTeamProduct(@PathVariable String productId) {
        return service.getWorkerTeamProduct(productId);
    }
}
