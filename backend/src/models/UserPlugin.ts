import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Plugin from './Plugin';

// UserPlugin attributes interface
export interface UserPluginAttributes {
  id: number;
  user_id: number;
  plugin_id: number;
  installed_at: Date;
  last_used_at: Date | null;
}

// Attributes that are optional during creation
interface UserPluginCreationAttributes extends Optional<UserPluginAttributes,
  'id' | 'installed_at' | 'last_used_at'> {}

// UserPlugin model class
class UserPlugin extends Model<UserPluginAttributes, UserPluginCreationAttributes> implements UserPluginAttributes {
  public id!: number;
  public user_id!: number;
  public plugin_id!: number;
  public readonly installed_at!: Date;
  public last_used_at!: Date | null;

  // Virtual fields for associations
  public readonly user?: User;
  public readonly plugin?: Plugin;
}

// Initialize model
UserPlugin.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '用户ID'
    },
    plugin_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '插件ID'
    },
    installed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '安装时间'
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后使用时间'
    }
  },
  {
    sequelize,
    tableName: 'user_plugins',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['plugin_id'] },
      {
        fields: ['user_id', 'plugin_id'],
        unique: true,
        name: 'idx_user_plugin_unique'
      }
    ]
  }
);

// Define associations
UserPlugin.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

UserPlugin.belongsTo(Plugin, {
  foreignKey: 'plugin_id',
  as: 'plugin'
});

// Also define reverse associations
User.belongsToMany(Plugin, {
  through: UserPlugin,
  foreignKey: 'user_id',
  otherKey: 'plugin_id',
  as: 'installedPlugins'
});

Plugin.belongsToMany(User, {
  through: UserPlugin,
  foreignKey: 'plugin_id',
  otherKey: 'user_id',
  as: 'installers'
});

export default UserPlugin;
