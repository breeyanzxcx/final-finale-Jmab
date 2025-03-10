<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../config/database.php';
require_once '../../models/Product.php';

$database = new Database();
$db = $database->connect();

$product = new Product($db);

$products = $product->getProducts();

if (!empty($products)) {
    http_response_code(200);
    echo json_encode($products);
} else {
    http_response_code(404);
    echo json_encode(['message' => 'No products found.']);
}
?>