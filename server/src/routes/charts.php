<?php
declare(strict_types=1);

use Kakeizu\App;

    if ($route==='/charts' && $method==='GET') {$u=owner();$q=$db->prepare('SELECT c.id,c.title,c.updated_at,COUNT(n.id) node_count FROM charts c LEFT JOIN chart_nodes n ON n.chart_id=c.id WHERE c.user_id=? GROUP BY c.id ORDER BY c.updated_at DESC');$q->execute([$u['id']]);App::ok(array_map(fn($c)=>['id'=>$c['id'],'title'=>$c['title'],'nodeCount'=>(int)$c['node_count'],'updatedAt'=>$c['updated_at'].'Z'],$q->fetchAll()));}
    if ($route==='/charts' && $method==='POST') {$u=owner(true);$title=text(App::input(),'title',80);$id=App::id();$db->prepare('INSERT INTO charts(id,user_id,title) VALUES(?,?,?)')->execute([$id,$u['id'],$title]);App::ok(['id'=>$id,'title'=>$title,'nodeCount'=>0,'updatedAt'=>gmdate('c')],201);}
    if (preg_match('#^/charts/([a-f0-9]{32})$#',$route,$m)) {
        $u=owner($method!=='GET');$chart=chartOwned($m[1],$u['id']);
        if($method==='GET')App::ok(chartDetail($m[1],$u['id']));
        if($method==='PATCH'){$title=text(App::input(),'title',80);$db->prepare('UPDATE charts SET title=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$title,$m[1]]);App::ok(['id'=>$m[1],'title'=>$title,'nodeCount'=>0,'updatedAt'=>gmdate('c')]);}
        if($method==='DELETE'){$db->prepare('DELETE FROM charts WHERE id=?')->execute([$m[1]]);App::ok();}
    }
    if (preg_match('#^/charts/([a-f0-9]{32})/nodes$#',$route,$m) && $method==='POST') {
        $u=owner(true);chartOwned($m[1],$u['id']);$in=App::input();$rel=relationshipOwned((string)($in['relationshipId']??''),$u['id']);genderOwned((string)($in['genderId']??''),$u['id']);
        $anchor=nodeRef($in['anchorNodeId']??null,$m[1]);[$parent1,$parent2,$direction]=familyRefs($in,$m[1]);$connection=connectionDirection($in);
        $font=nodeFontSize($in['fontSize']??16,'メモ');$relationshipFont=nodeFontSize($in['relationshipFontSize']??17,'続柄');$memo=mb_substr((string)App::utf8((string)($in['memo']??'')),0,2000,'UTF-8');$scale=nodeScale($in['scale']??1);$x=finiteCoordinate($in['x']??240);$y=finiteCoordinate($in['y']??180);$nodeId=App::id();
        $divorced=boolValue($in['divorced']??false);$db->beginTransaction();$db->prepare('INSERT INTO chart_nodes(id,chart_id,relationship_definition_id,gender_definition_id,anchor_node_id,parent_node_id_1,parent_node_id_2,placement_direction,connection_direction,divorced,memo,font_size,relationship_font_size,scale,x,y) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([$nodeId,$m[1],$rel['id'],$in['genderId'],$anchor,$parent1,$parent2,$direction,$connection,$divorced,$memo,$font,$relationshipFont,$scale,$x,$y]);
        if($anchor&&$rel['kind']!=='self'){$source=$rel['kind']==='parent'?$nodeId:$anchor;$target=$rel['kind']==='parent'?$anchor:$nodeId;$db->prepare('INSERT INTO chart_edges(id,chart_id,source_node_id,target_node_id,relationship_definition_id) VALUES(?,?,?,?,?)')->execute([App::id(),$m[1],$source,$target,$rel['id']]);}
        $db->prepare('UPDATE charts SET updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$m[1]]);$db->commit();App::ok(chartDetail($m[1],$u['id']),201);
    }
    if (preg_match('#^/charts/([a-f0-9]{32})/nodes/layout$#',$route,$m) && $method==='PATCH') {
        $u=owner(true);chartOwned($m[1],$u['id']);$items=App::input()['nodes']??null;
        if(!is_array($items)||count($items)>500)App::fail(422,'VALIDATION_ERROR','レイアウト情報を確認してください');
        $seen=[];$updates=[];
        foreach($items as $item){
            if(!is_array($item))App::fail(422,'VALIDATION_ERROR','レイアウト情報を確認してください');
            $nodeId=(string)($item['id']??'');
            if(!preg_match('/^[a-f0-9]{32}$/',$nodeId)||isset($seen[$nodeId]))App::fail(422,'VALIDATION_ERROR','ノードIDを確認してください');
            $q=$db->prepare('SELECT id FROM chart_nodes WHERE id=? AND chart_id=?');$q->execute([$nodeId,$m[1]]);if(!$q->fetchColumn())App::fail(422,'INVALID_NODE_REFERENCE','同じ相関図のノードを選択してください');
            $seen[$nodeId]=true;$updates[]=[$nodeId,finiteCoordinate($item['x']??null),finiteCoordinate($item['y']??null),nodeScale($item['scale']??null)];
        }
        $db->beginTransaction();$q=$db->prepare('UPDATE chart_nodes SET x=?,y=?,scale=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND chart_id=?');
        foreach($updates as [$nodeId,$x,$y,$scale])$q->execute([$x,$y,$scale,$nodeId,$m[1]]);
        $db->prepare('UPDATE charts SET updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$m[1]]);$db->commit();App::ok(chartDetail($m[1],$u['id']));
    }
    if (preg_match('#^/charts/([a-f0-9]{32})/nodes/([a-f0-9]{32})$#',$route,$m)) {
        $u=owner(true);chartOwned($m[1],$u['id']);$q=$db->prepare('SELECT * FROM chart_nodes WHERE id=? AND chart_id=?');$q->execute([$m[2],$m[1]]);$node=$q->fetch();if(!$node)App::fail(404,'NOT_FOUND','ノードが見つかりません');
        if($method==='DELETE'){$db->beginTransaction();$db->prepare('UPDATE chart_nodes SET parent_node_id_1=NULL,parent_node_id_2=NULL WHERE chart_id=? AND (parent_node_id_1=? OR parent_node_id_2=?)')->execute([$m[1],$m[2],$m[2]]);$db->prepare('DELETE FROM chart_nodes WHERE id=?')->execute([$m[2]]);$db->prepare('UPDATE charts SET updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$m[1]]);$db->commit();App::ok(chartDetail($m[1],$u['id']));}
        if($method==='PATCH'){$in=App::input();$relId=(string)($in['relationshipId']??$node['relationship_definition_id']);$genderId=(string)($in['genderId']??$node['gender_definition_id']);$rel=relationshipOwned($relId,$u['id']);genderOwned($genderId,$u['id']);$font=nodeFontSize($in['fontSize']??$node['font_size'],'メモ');$relationshipFont=nodeFontSize($in['relationshipFontSize']??$node['relationship_font_size'],'続柄');$memo=mb_substr((string)App::utf8((string)($in['memo']??$node['memo'])),0,2000,'UTF-8');$scale=nodeScale($in['scale']??$node['scale']);$x=finiteCoordinate($in['x']??$node['x']);$y=finiteCoordinate($in['y']??$node['y']);$anchor=array_key_exists('anchorNodeId',$in)?$in['anchorNodeId']:$node['anchor_node_id'];
            $anchor=nodeRef($anchor,$m[1],$m[2]);[$parent1,$parent2,$direction]=familyRefs($in,$m[1],$m[2],$node);$connection=connectionDirection($in,$node);$divorced=array_key_exists('divorced',$in)?boolValue($in['divorced']):(int)$node['divorced'];
            $db->beginTransaction();
            $db->prepare('UPDATE chart_nodes SET relationship_definition_id=?,gender_definition_id=?,anchor_node_id=?,parent_node_id_1=?,parent_node_id_2=?,placement_direction=?,connection_direction=?,divorced=?,memo=?,font_size=?,relationship_font_size=?,scale=?,x=?,y=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$relId,$genderId,$anchor,$parent1,$parent2,$direction,$connection,$divorced,$memo,$font,$relationshipFont,$scale,$x,$y,$m[2]]);
            if($node['anchor_node_id']){$db->prepare('DELETE FROM chart_edges WHERE chart_id=? AND ((source_node_id=? AND target_node_id=?) OR (source_node_id=? AND target_node_id=?))')->execute([$m[1],$m[2],$node['anchor_node_id'],$node['anchor_node_id'],$m[2]]);}
            if($anchor&&$rel['kind']!=='self'){$source=$rel['kind']==='parent'?$m[2]:$anchor;$target=$rel['kind']==='parent'?$anchor:$m[2];$db->prepare('INSERT INTO chart_edges(id,chart_id,source_node_id,target_node_id,relationship_definition_id) VALUES(?,?,?,?,?)')->execute([App::id(),$m[1],$source,$target,$relId]);}
            $db->prepare('UPDATE charts SET updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$m[1]]);$db->commit();App::ok(chartDetail($m[1],$u['id']));
        }
    }
