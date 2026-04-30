package com.alibaba.himarket.controller.portal;

import com.alibaba.himarket.core.annotation.PublicAccess;
import com.alibaba.himarket.dto.result.common.PageResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductResult;
import com.alibaba.himarket.service.WorkerTeamProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/portal/worker-team-products")
@PublicAccess
@Validated
@RequiredArgsConstructor
public class WorkerTeamProductPortalController {

    private final WorkerTeamProductService service;

    @GetMapping
    public PageResult<WorkerTeamProductResult> listWorkerTeamProducts(Pageable pageable) {
        return service.listWorkerTeamProducts(pageable);
    }

    @GetMapping("/{productId}")
    public WorkerTeamProductResult getWorkerTeamProduct(@PathVariable String productId) {
        return service.getWorkerTeamProduct(productId);
    }
}
