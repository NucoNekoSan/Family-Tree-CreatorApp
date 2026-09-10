<?php
declare(strict_types=1);

use Kakeizu\App;

function owner(bool $write = false): array { return App::user($write); }
function text(array $data, string $key, int $max, bool $required = true): string {
    $value = trim((string)App::utf8((string)($data[$key] ?? '')));
    if (($required && $value === '') || mb_strlen($value, 'UTF-8') > $max) App::fail(422, 'VALIDATION_ERROR', '入力内容を確認してください', [$key => "1〜{$max}文字で入力してください"]);
    return $value;
}
function boolValue(mixed $value): int { return filter_var($value, FILTER_VALIDATE_BOOL) ? 1 : 0; }
function nodeFontSize(mixed $value, string $label): int {
    if (!is_numeric($value)) App::fail(422,'VALIDATION_ERROR',"{$label}のフォントサイズを確認してください");
    $font=(int)$value;
    if($font<8||$font>48)App::fail(422,'VALIDATION_ERROR',"{$label}のフォントサイズは8〜48pxで指定してください");
    return $font;
}
function nodeScale(mixed $value): float {
    if (!is_numeric($value)) App::fail(422,'VALIDATION_ERROR','ノード倍率を確認してください');
    $scale=(float)$value;
    if (!is_finite($scale)||$scale<0.4||$scale>2.0) App::fail(422,'VALIDATION_ERROR','ノード倍率は0.4〜2.0で指定してください');
    return $scale;
}
function finiteCoordinate(mixed $value): float {
    if (!is_numeric($value)) App::fail(422,'VALIDATION_ERROR','ノード座標を確認してください');
    $coordinate=(float)$value;
    if (!is_finite($coordinate)) App::fail(422,'VALIDATION_ERROR','ノード座標を確認してください');
    return $coordinate;
}
function chartOwned(string $chartId, string $userId): array {
    $q = App::db()->prepare('SELECT * FROM charts WHERE id=? AND user_id=?');
    $q->execute([$chartId, $userId]);
    $chart = $q->fetch();
    if (!$chart) App::fail(404, 'NOT_FOUND', '相関図が見つかりません');
    return $chart;
}
function relationshipOwned(string $id, string $userId): array {
    $q=App::db()->prepare('SELECT * FROM relationship_definitions WHERE id=? AND user_id=?');
    $q->execute([$id,$userId]); $row=$q->fetch();
    if(!$row) App::fail(422,'INVALID_RELATIONSHIP','続柄を選び直してください');
    return $row;
}
function genderOwned(string $id, string $userId): array {
    $q=App::db()->prepare('SELECT * FROM gender_definitions WHERE id=? AND user_id=?');
    $q->execute([$id,$userId]); $row=$q->fetch();
    if(!$row) App::fail(422,'INVALID_GENDER','性別を選び直してください');
    return $row;
}
function nodeRef(?string $id,string $chartId,string $currentId='',string $field='anchorNodeId'): ?string {
    if(!$id)return null;
    if($id===$currentId)App::fail(422,'INVALID_NODE_REFERENCE','自身は選択できません',[$field=>'別のノードを選択してください']);
    $q=App::db()->prepare('SELECT id FROM chart_nodes WHERE id=? AND chart_id=?');$q->execute([$id,$chartId]);
    if(!$q->fetchColumn())App::fail(422,'INVALID_NODE_REFERENCE','同じ相関図のノードを選択してください',[$field=>'選択し直してください']);
    return $id;
}
function familyRefs(array $in,string $chartId,string $currentId='',array $old=[]): array {
    $p1=array_key_exists('parentNodeId1',$in)?($in['parentNodeId1']?:null):($old['parent_node_id_1']??null);
    $p2=array_key_exists('parentNodeId2',$in)?($in['parentNodeId2']?:null):($old['parent_node_id_2']??null);
    if(!$p1&&$p2)App::fail(422,'INVALID_PARENT_PAIR','親2を指定する場合は親1も選択してください');
    if($p1===$p2&&$p1)App::fail(422,'INVALID_PARENT_PAIR','異なる2名の親を選択してください');
    $direction=array_key_exists('placementDirection',$in)?($in['placementDirection']?:null):($old['placement_direction']??null);
    if($direction!==null&&!in_array($direction,['above','below','left','right'],true))App::fail(422,'VALIDATION_ERROR','配置方向を選び直してください');
    return [nodeRef($p1,$chartId,$currentId,'parentNodeId1'),nodeRef($p2,$chartId,$currentId,'parentNodeId2'),$direction];
}
function connectionDirection(array $in,array $old=[]): ?string {
    $direction=array_key_exists('connectionDirection',$in)?($in['connectionDirection']?:null):($old['connection_direction']??null);
    if($direction!==null&&!in_array($direction,['above','below','left','right'],true))App::fail(422,'VALIDATION_ERROR','線の接続方向を選び直してください');
    return $direction;
}
function publicRelationKind(array $r): string { return ($r['diagram_role']??'standard')==='sibling'?'sibling':(($r['diagram_role']??'standard')==='divorce'?'divorce':$r['kind']); }
function storedRelationKind(string $kind): array { return $kind==='sibling'?['other','sibling']:($kind==='divorce'?['partner','divorce']:[$kind,'standard']); }
function mapRelationship(array $r): array { return ['id'=>$r['id'],'name'=>$r['name'],'kind'=>publicRelationKind($r),'direction'=>$r['direction'],'lineStyle'=>$r['line_style'],'lineColor'=>$r['line_color'],'sortOrder'=>(int)$r['sort_order'],'active'=>(bool)$r['active'],'usageCount'=>(int)($r['usage_count']??0)]; }
function mapGender(array $g): array { return ['id'=>$g['id'],'name'=>$g['name'],'shape'=>$g['shape'],'fillColor'=>$g['fill_color'],'textColor'=>$g['text_color'],'sortOrder'=>(int)$g['sort_order'],'active'=>(bool)$g['active'],'usageCount'=>(int)($g['usage_count']??0)]; }
function chartDetail(string $chartId, string $userId): array {
    $chart=chartOwned($chartId,$userId);
    $q=App::db()->prepare('SELECT * FROM relationship_definitions WHERE user_id=? ORDER BY sort_order,name');$q->execute([$userId]);$relations=array_map('mapRelationship',$q->fetchAll());
    $q=App::db()->prepare('SELECT * FROM gender_definitions WHERE user_id=? ORDER BY sort_order,name');$q->execute([$userId]);$genders=array_map('mapGender',$q->fetchAll());
    $q=App::db()->prepare('SELECT * FROM chart_nodes WHERE chart_id=? ORDER BY created_at');$q->execute([$chartId]);$nodes=array_map(fn($n)=>['id'=>$n['id'],'relationshipId'=>$n['relationship_definition_id'],'genderId'=>$n['gender_definition_id'],'anchorNodeId'=>$n['anchor_node_id'],'parentNodeId1'=>$n['parent_node_id_1'],'parentNodeId2'=>$n['parent_node_id_2'],'placementDirection'=>$n['placement_direction'],'connectionDirection'=>$n['connection_direction'],'divorced'=>(bool)$n['divorced'],'memo'=>$n['memo'],'fontSize'=>(int)$n['font_size'],'relationshipFontSize'=>(int)$n['relationship_font_size'],'scale'=>(float)$n['scale'],'x'=>(float)$n['x'],'y'=>(float)$n['y']],$q->fetchAll());
    $q=App::db()->prepare('SELECT e.*,r.kind,r.diagram_role,r.line_style,r.line_color FROM chart_edges e JOIN relationship_definitions r ON r.id=e.relationship_definition_id WHERE e.chart_id=?');$q->execute([$chartId]);$edges=array_map(fn($e)=>['id'=>$e['id'],'source'=>$e['source_node_id'],'target'=>$e['target_node_id'],'relationshipId'=>$e['relationship_definition_id'],'relationKind'=>publicRelationKind($e),'lineStyle'=>$e['line_style'],'lineColor'=>$e['line_color']],$q->fetchAll());
    return ['id'=>$chart['id'],'title'=>$chart['title'],'nodes'=>$nodes,'edges'=>$edges,'relationships'=>$relations,'genders'=>$genders,'updatedAt'=>$chart['updated_at'].'Z'];
}
function createAuthToken(string $table,string $userId,string $expiry): string {
    if (!in_array($table, ['email_verification_tokens', 'password_reset_tokens'], true)) {
        throw new InvalidArgumentException('Unsupported token table');
    }
    $token=App::token();$q=App::db()->prepare("DELETE FROM {$table} WHERE user_id=?");$q->execute([$userId]);$q=App::db()->prepare("INSERT INTO {$table}(token_hash,user_id,expires_at) VALUES(?,?,?)");$q->execute([hash('sha256',$token),$userId,App::now($expiry)]);return $token;
}
