create or replace function get_poll_results(p_poll_id uuid, p_user_id uuid default null)
returns table (
    id uuid,
    title text,
    description text,
    created_at timestamptz,
    created_by uuid,
    total_votes bigint,
    user_vote uuid,
    options json
) as $$
begin
    return query
    with vote_counts as (
        select
            option_id,
            count(*) as votes
        from
            votes
        where
            poll_id = p_poll_id
        group by
            option_id
    ),
    poll_options_with_votes as (
        select
            po.id,
            po.text,
            coalesce(vc.votes, 0) as vote_count
        from
            poll_options po
            left join vote_counts vc on po.id = vc.option_id
        where
            po.poll_id = p_poll_id
    )
    select
        p.id,
        p.title,
        p.description,
        p.created_at,
        p.created_by,
        (select sum(vote_count) from poll_options_with_votes) as total_votes,
        (select option_id from votes where poll_id = p_poll_id and user_id = p_user_id) as user_vote,
        json_agg(
            json_build_object(
                'id', powv.id,
                'text', powv.text,
                'vote_count', powv.vote_count
            )
        ) as options
    from
        polls p,
        poll_options_with_votes powv
    where
        p.id = p_poll_id
    group by
        p.id;
end;
$$ language plpgsql;
