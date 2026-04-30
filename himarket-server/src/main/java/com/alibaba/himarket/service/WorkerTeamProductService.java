package com.alibaba.himarket.service;

import com.alibaba.himarket.dto.params.worker.UpsertWorkerTeamProductParam;
import com.alibaba.himarket.dto.result.common.PageResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductResult;
import org.springframework.data.domain.Pageable;

public interface WorkerTeamProductService {

    WorkerTeamProductResult upsertWorkerTeamProduct(UpsertWorkerTeamProductParam param);

    PageResult<WorkerTeamProductResult> listWorkerTeamProducts(Pageable pageable);

    WorkerTeamProductResult getWorkerTeamProduct(String productId);
}
