Ext.define('Ext.ux.ModalGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.ModalGrid',
    itemId: 'ModalGrid',

    tools: [{
        cls: 'x-tool-plus',
        type: 'plus',
        pressed: true,
        tooltip: 'Add',
        handler: function(event, toolEl, panel) {
            var mf = this.up("ModalGrid").modalForm;
            var grid = this.up("ModalGrid");
            var gridModel = grid.store.getProxy().getModel();
            var blankItem = Ext.create(gridModel, {});
            var lastItem = grid.getStore().add(blankItem);
            var rec = grid.getStore().last();
            mf.getComponent("ModalGridFormPanel").form.reset();
            mf.getComponent("ModalGridFormPanel").loadRecord(rec);
            mf.show();
        }
    }],

    // Initialize grid component, with support for modal dialogs
    initComponent: function() {
        // Save the scope
        var that = this;

        // Create modal form
        var mf = [];
        for (var i = 0; i < that.columns.length; i++) {
            mf.push(that.columns[i]);
        }

        this.modalForm = Ext.create("Ext.ux.ModalGridEditor", {
            autogenerateFields: mf
        });

        // Remove editors for all columns in the grid. Can only be edited by modals
        for (i = 0; i < this.columns.length; i++) {
            var col = this.columns[i];
            if (col.editor) {
                col.editor = null;
            }
        }

        // We've built the modal form, and removed editors from the grid... now create the grid itself
        this.callParent(arguments);

        // Add an additional ActionColumn, with Edit and Delete controls
        var column = Ext.create('Ext.grid.ActionColumn', {
            itemId: 'modalActionColumn',
            menuDisabled: true,
            items: [{
                icon: 'img/edit.png',
                tooltip: 'Edit',
                handler: function(grid, rowIndex, colIndex) {
                    mf.isNew = false;
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.getCmp('editPanel').config.inEdit = true;
                    that.modalForm.getComponent("ModalGridFormPanel").form.reset();
                    that.modalForm.getComponent("ModalGridFormPanel").loadRecord(rec);
                    that.modalForm.show();
                }
            }, {
                icon: 'img/delete.png',
                tooltip: 'Delete',
                handler: function(grid, rowIndex, colIndex) {
                    Ext.Msg.confirm("Delete", "Are you sure you want to delete?", function(btn) {
                        if (btn == "yes") {
                            var rec = grid.getStore().getAt(rowIndex);
                            grid.getStore().remove(rec);
                        }
                    });
                }
            }]
        });

        this.headerCt.insert(this.columns.length, column);
    }
});

// ModalGridEditor is the Modal Window which is launched when you "add" a new item
// or "edit" an existing item via the Modal Grid
Ext.define('Ext.ux.ModalGridEditor', {
    alias: 'widget.ModalGridEditor',
    extend: 'Ext.Window',
    layout: 'fit',
    width: 500,
    height: 300,
    scrollable: true,
    modal: true,
    centered: true,
    itemId: 'ModalGridWindow',
    title: 'Edit',
    closeAction: 'hide',
    listeners: {
        'show': function() {
            this.mon(Ext.getBody(), 'mousedown', this.checkCloseClick, this);
        }
    },

    // Modal dialog closes (without saving) if user clicks outside modal dialog
    checkCloseClick: function(event) {
        var cx = event.getX(),
            cy = event.getY(),
            box = this.getBox();
        if (cx < box.x || cx > box.x + box.width || cy < box.y || cy > box.y + box.height) {
            if (Ext.getCmp('editPanel').config.inEdit.valueOf()) {
                this.hide();
            } else {
                var me = this.getComponent("ModalGridFormPanel").form;
                var rec = me.getRecord();
                if (rec.store !== null) {
                    var lengthOfRecord = rec.store.getCount();
                    rec.store.removeAt(lengthOfRecord - 1);
                }
                this.hide();
            }
            Ext.getCmp('editPanel').config.inEdit = false;
            this.mun(Ext.getBody(), 'mousedown', this.checkCloseClick, this);
        }
    },

    initComponent: function() {
        this.callParent(arguments);

        // Dynamically generate fields and labels based on Grid
        var fields = this.autogenerateFields;
        var panel = Ext.create('Ext.form.Panel', {
            itemId: 'ModalGridFormPanel'
        });
        var that = this;

        Ext.iterate(fields, function(field) {
            console.log(field);

            // Be careful. Referencing instead of copying values, this field label is tied to the original
            if (field.editor) {
                // Add label, if it exists
                if (field.header) {
                    field.editor.fieldLabel = field.header;
                } else if (field.text) {
                    field.editor.fieldLabel = field.text;
                }

                // Set name == dataIndex. Now we can pass the data from the grid by calling setValues()
                field.editor.name = field.dataIndex;

                // Add form component
                panel.add(field.editor);
            }
        });

        // Add cancel and save buttons
        panel.add({
            xtype: 'container',
            border: false,
            layout: {
                type: 'hbox'
            },
            id: 'editPanel',
            config: {
                inEdit: false
            },
            items: [{
                xtype: 'button',
                text: 'Cancel',
                id: 'cancelGrid',
                handler: function(grid, rowIndex, colIndex) {
                    this.mun(Ext.getBody(), 'mousedown', this.checkCloseClick, this);
                    if (Ext.getCmp('editPanel').config.inEdit.valueOf()) {
                        this.hide();
                        Ext.getCmp('editPanel').config.inEdit = false;
                    } else {
                        var me = this.getComponent("ModalGridFormPanel").form;
                        var rec = me.getRecord();
                        var newValues = me.getValues();
                        if (rec.store !== null) {
                            var lengthOfRecord = rec.store.getCount();
                            rec.store.removeAt(lengthOfRecord - 1);
                        }
                        this.hide();
                    }
                },
                scope: this
            }, {
                xtype: 'button',
                text: 'Save',
                id: 'saveGrid',
                handler: function() {
                    this.mun(Ext.getBody(), 'mousedown', this.checkCloseClick, this);
                    var me = this.getComponent("ModalGridFormPanel").form;
                    var rec = me.getRecord();
                    var newValues = me.getValues();

                    var keys = [];
                    for (var key in newValues) {
                        if (newValues.hasOwnProperty(key)) {
                            keys.push(key);
                        }
                    }

                    // Update value for all items
                    for (var i = 0; i < keys.length; i++) {
                        rec.set(keys[i], newValues[keys[i]]);
                    }
                    console.log(keys);
                    console.log(newValues);

                    console.log("Save");
                    this.hide();
                    Ext.getCmp('editPanel').config.inEdit = false;
                },
                scope: this
            }]
        });

        panel.doLayout(false, true);
        this.add(panel);
        this.doLayout(false, true);
    }
});