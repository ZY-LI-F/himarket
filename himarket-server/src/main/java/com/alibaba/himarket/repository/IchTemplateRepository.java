package com.alibaba.himarket.repository;

import com.alibaba.himarket.entity.IchTemplate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public interface IchTemplateRepository extends BaseRepository<IchTemplate, Long> {

    Optional<IchTemplate> findBySpecAndVersionAndSectionPath(
            String spec, String version, String sectionPath);

    List<IchTemplate> findBySpecAndVersionOrderBySectionOrderAscSectionPathAsc(
            String spec, String version);

    List<IchTemplate> findByVersionOrderBySpecAscSectionOrderAscSectionPathAsc(String version);
}
