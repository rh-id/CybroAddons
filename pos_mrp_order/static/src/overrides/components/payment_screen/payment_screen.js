/** @odoo-module **/
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";
// Patch the PaymentScreen to create manufacturing orders when the order is validated
patch(PaymentScreen.prototype, {
        setup() {
        super.setup(...arguments);
         this.orm = useService("orm");
    },
    // Creating manufacturing orders
       createMRP() {
        const order = this.currentOrder;
        var order_line = order.get_orderlines()
        var due = order.get_due();
        for (var i in order_line){
            var list_product = []
            if (order_line[i].product_id){
                if (order_line[i].qty > 0){
                    var product_dict = {
                        'id': order_line[i].product_id['id'],
                        'qty': order_line[i].qty,
                        'product_tmpl_id': order_line[i].product_tmpl_id,
                        'pos_reference': order.name,
                        'uom_id': order_line[i].product_id['uom_id']['id'],
                    };
                    list_product.push(product_dict);
                }
            }
            if (list_product.length){
                this.orm.call('mrp.production', 'create_mrp_from_pos', [1,list_product])
            }
        }
    },
    // Override the function validateOrder
    async validateOrder(isForceValidate) {
        if(this.pos.config.cash_rounding) {
            if(!this.pos.get_order().check_paymentlines_rounding()) {
                this.showPopup('ErrorPopup', {
                    title: _t('Rounding error in payment lines'),
                    body: _t("The amount of your payment lines must be rounded to validate the transaction."),
                });
                return;
            }
        }
        if (await this._isOrderValid(isForceValidate)) {
            // Remove pending payments before finalizing the validation
            for (let line of this.paymentLines) {
                if (!line.is_done()) this.currentOrder.remove_paymentline(line);
            }
            await this._finalizeValidation();
        }
        this.createMRP();
    }
});
