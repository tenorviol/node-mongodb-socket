<?php

$mongo = new Mongo('mongodb://localhost:3000');
$db = $mongo->test;
$c = $db->test;

$c->insert(array('foo'=>'bar'));
