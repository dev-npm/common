latesr***********

WITH target_fqns AS
(
    /*
      Get the FQNs and configuration for the requested release.
    */
    SELECT
        rf.fqn_id,
        f.fqn_number,

        rr.release_name,
        rr.release_date,

        r.library_release_key_id,

        sn.speed_node_name,
        tdk.tdk_name,
        l.library_name,
        lv.library_version_name

    FROM request r

    JOIN request_release rr
        ON rr.request_id = r.request_id

    JOIN release_fqn rf
        ON rf.request_release_id = rr.request_release_id

    JOIN fqn f
        ON f.fqn_id = rf.fqn_id

    JOIN library_release_key lrk
        ON lrk.library_release_key_id = r.library_release_key_id

    JOIN speed_node sn
        ON sn.speed_node_id = lrk.speed_node_id

    JOIN tech_design_kit tdk
        ON tdk.tdk_id = lrk.tdk_id

    JOIN library l
        ON l.library_id = lrk.library_id

    JOIN library_version lv
        ON lv.library_version_id = lrk.library_version_id

    WHERE r.request_id = :request_id
      AND rr.request_release_id = :release_id
),

matching_fqn_records AS
(
    /*
      Find the same FQN across every request and every release
      where the complete technical configuration is the same.

      The release does not need to match.
    */
    SELECT
        tf.fqn_id AS target_fqn_id,
        rf2.release_fqn_id,
        r2.custom_slice_name

    FROM target_fqns tf

    JOIN request r2
        ON r2.library_release_key_id =
           tf.library_release_key_id

    JOIN request_release rr2
        ON rr2.request_id = r2.request_id

    JOIN release_fqn rf2
        ON rf2.request_release_id =
           rr2.request_release_id
       AND rf2.fqn_id = tf.fqn_id
),

all_slice_names AS
(
    /*
      Predefined slices associated with matching FQN records.
    */
    SELECT
        mfr.target_fqn_id,
        TRIM(s.slice_name) AS slice_name

    FROM matching_fqn_records mfr

    JOIN release_fqn_slice rfs
        ON rfs.release_fqn_id =
           mfr.release_fqn_id

    JOIN slice s
        ON s.slice_id = rfs.slice_id

    WHERE NULLIF(TRIM(s.slice_name), '') IS NOT NULL

    UNION

    /*
      Custom slice names from the requests containing
      the matching FQN records.
    */
    SELECT
        mfr.target_fqn_id,
        TRIM(mfr.custom_slice_name) AS slice_name

    FROM matching_fqn_records mfr

    WHERE NULLIF(
        TRIM(mfr.custom_slice_name),
        ''
    ) IS NOT NULL
),

fqn_slice_arrays AS
(
    /*
      Create one distinct slice-name array for each target FQN.
    */
    SELECT
        tf.fqn_id,

        COALESCE(
            ARRAY_AGG(
                DISTINCT asn.slice_name
                ORDER BY asn.slice_name
            ) FILTER (
                WHERE asn.slice_name IS NOT NULL
            ),
            ARRAY[]::TEXT[]
        ) AS slice_names

    FROM target_fqns tf

    LEFT JOIN all_slice_names asn
        ON asn.target_fqn_id = tf.fqn_id

    GROUP BY
        tf.fqn_id
)

SELECT
    tf.fqn_number,

    tf.release_name,
    tf.release_date,

    tf.speed_node_name,
    tf.tdk_name,
    tf.library_name,
    tf.library_version_name,

    fsa.slice_names

FROM target_fqns tf

LEFT JOIN fqn_slice_arrays fsa
    ON fsa.fqn_id = tf.fqn_id

ORDER BY
    tf.fqn_number;





    latesr****8



new***************



SELECT
    f.fqn_number,

    rr.release_name,
    rr.release_date,

    sn.speed_node_name,
    tdk.tdk_name,
    l.library_name,
    lv.library_version_name,

    COALESCE(
        slices.slice_names,
        ARRAY[]::TEXT[]
    ) AS slice_names

FROM release_fqn rf

JOIN fqn f
    ON f.fqn_id = rf.fqn_id

JOIN request_release rr
    ON rr.request_release_id = rf.request_release_id

JOIN request r
    ON r.request_id = rr.request_id

JOIN library_release_key lrk
    ON lrk.library_release_key_id = r.library_release_key_id

JOIN speed_node sn
    ON sn.speed_node_id = lrk.speed_node_id

JOIN tech_design_kit tdk
    ON tdk.tdk_id = lrk.tdk_id

JOIN library l
    ON l.library_id = lrk.library_id

JOIN library_version lv
    ON lv.library_version_id = lrk.library_version_id

/*
    Build one distinct slice-name array for the current release-FQN.
*/
LEFT JOIN LATERAL
(
    SELECT
        ARRAY_AGG(
            DISTINCT x.slice_name
            ORDER BY x.slice_name
        ) AS slice_names
    FROM
    (
        /*
            Predefined slices associated with this release-FQN.
        */
        SELECT
            TRIM(s.slice_name) AS slice_name

        FROM release_fqn_slice rfs

        JOIN slice s
            ON s.slice_id = rfs.slice_id

        WHERE rfs.release_fqn_id = rf.release_fqn_id
          AND NULLIF(TRIM(s.slice_name), '') IS NOT NULL

        UNION

        /*
            Custom slice stored on the request.
        */
        SELECT
            TRIM(r.custom_slice_name) AS slice_name

        WHERE NULLIF(TRIM(r.custom_slice_name), '') IS NOT NULL
    ) x
) slices
    ON TRUE

WHERE r.request_id = :request_id
  AND rr.request_release_id = :release_id

ORDER BY
    f.fqn_number;



    new************

************************************
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

