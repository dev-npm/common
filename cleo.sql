WITH all_fqn_slices AS
(
    /*
        Predefined slices selected for a release-FQN.
    */
    SELECT
        rf.release_fqn_id,
        s.slice_name::TEXT AS slice_name
    FROM release_fqn rf
    INNER JOIN release_fqn_slice rfs
        ON rfs.release_fqn_id = rf.release_fqn_id
    INNER JOIN slice s
        ON s.slice_id = rfs.slice_id

    UNION

    /*
        Custom slice inherited from the request.

        It is included only when this release-FQN is marked
        to include the request's custom slice.
    */
    SELECT
        rf.release_fqn_id,
        BTRIM(r.custom_slice_name)::TEXT AS slice_name
    FROM release_fqn rf
    INNER JOIN request_release rr
        ON rr.request_release_id = rf.request_release_id
    INNER JOIN request r
        ON r.request_id = rr.request_id
    WHERE rf.include_custom_slice = TRUE
      AND NULLIF(BTRIM(r.custom_slice_name), '') IS NOT NULL
)

SELECT
    f.fqn_id,
    f.fqn_number,

    r.library_release_key_id,

    rr.release_name,
    rr.release_date,

    COALESCE(
        ARRAY_AGG(
            DISTINCT afs.slice_name
            ORDER BY afs.slice_name
        ) FILTER (
            WHERE afs.slice_name IS NOT NULL
        ),
        ARRAY[]::TEXT[]
    ) AS slice_names

FROM release_fqn rf

INNER JOIN fqn f
    ON f.fqn_id = rf.fqn_id

INNER JOIN request_release rr
    ON rr.request_release_id = rf.request_release_id

INNER JOIN request r
    ON r.request_id = rr.request_id

LEFT JOIN all_fqn_slices afs
    ON afs.release_fqn_id = rf.release_fqn_id

GROUP BY
    f.fqn_id,
    f.fqn_number,
    r.library_release_key_id,
    rr.release_name,
    rr.release_date

ORDER BY
    f.fqn_number,
    r.library_release_key_id,
    rr.release_date,
    rr.release_name;

WITH all_fqn_slices AS
(
    SELECT
        rf.release_fqn_id,
        s.slice_name::TEXT AS slice_name
    FROM release_fqn rf
    INNER JOIN release_fqn_slice rfs
        ON rfs.release_fqn_id = rf.release_fqn_id
    INNER JOIN slice s
        ON s.slice_id = rfs.slice_id

    UNION

    SELECT
        rf.release_fqn_id,
        BTRIM(r.custom_slice_name)::TEXT AS slice_name
    FROM release_fqn rf
    INNER JOIN request_release rr
        ON rr.request_release_id = rf.request_release_id
    INNER JOIN request r
        ON r.request_id = rr.request_id
    WHERE rf.include_custom_slice = TRUE
      AND NULLIF(BTRIM(r.custom_slice_name), '') IS NOT NULL
),

grouped_fqn AS
(
    SELECT
        f.fqn_id,
        f.fqn_number,

        r.library_release_key_id,

        rr.release_name,
        rr.release_date,

        COALESCE(
            ARRAY_AGG(
                DISTINCT afs.slice_name
                ORDER BY afs.slice_name
            ) FILTER (
                WHERE afs.slice_name IS NOT NULL
            ),
            ARRAY[]::TEXT[]
        ) AS slice_names

    FROM release_fqn rf

    INNER JOIN fqn f
        ON f.fqn_id = rf.fqn_id

    INNER JOIN request_release rr
        ON rr.request_release_id = rf.request_release_id

    INNER JOIN request r
        ON r.request_id = rr.request_id

    LEFT JOIN all_fqn_slices afs
        ON afs.release_fqn_id = rf.release_fqn_id

    GROUP BY
        f.fqn_id,
        f.fqn_number,
        r.library_release_key_id,
        rr.release_name,
        rr.release_date
)

SELECT COALESCE(
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'fqnId',                 gf.fqn_id,
            'fqnNumber',             gf.fqn_number,
            'libraryReleaseKeyId',   gf.library_release_key_id,
            'releaseName',           gf.release_name,
            'releaseDate',           gf.release_date,
            'sliceNames',            TO_JSONB(gf.slice_names)
        )
        ORDER BY
            gf.fqn_number,
            gf.library_release_key_id,
            gf.release_date
    ),
    '[]'::JSONB
) AS api_response
FROM grouped_fqn gf;

**************

