package com.alibaba.himarket.entity;

import jakarta.persistence.*;
import java.util.Locale;
import lombok.*;

@Entity
@Table(
        name = "ich_template",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_spec_section_version",
                    columnNames = {"spec", "section_path", "version"})
        },
        indexes = {
            @Index(
                    name = "idx_ich_template_spec_version_order",
                    columnList = "spec, version, section_order")
        })
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IchTemplate extends BaseEntity {

    public static final String DEFAULT_VERSION = "baseline";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "spec", nullable = false, length = 64)
    private String spec;

    @Column(name = "version", nullable = false, length = 64)
    private String version;

    @Column(name = "section_path", nullable = false, length = 128)
    private String sectionPath;

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "outline", nullable = false, columnDefinition = "longtext")
    private String outline;

    @Column(name = "source_path", nullable = false, length = 512)
    private String sourcePath;

    public static String normalizeSpec(String spec) {
        if (spec == null) {
            return null;
        }
        return spec.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "-");
    }
}
