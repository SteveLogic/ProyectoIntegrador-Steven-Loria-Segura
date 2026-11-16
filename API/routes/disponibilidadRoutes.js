const router=require('express').Router();
const controller=require('../controllers/disponibilidadController');
router.get('/slots',controller.slots);
router.get('/',controller.listar);
router.post('/',controller.crear);
router.put('/:id',controller.editar);
router.delete('/:id',controller.eliminar);
module.exports=router;
